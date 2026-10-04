const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login(email, password) {
  const res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password }
  );
  return { token: res.data?.data?.token, user: res.data?.data?.user };
}

async function runAITests() {
  console.log('--- STARTING AI TICKET INTELLIGENCE VERIFICATION SUITE (MOCK AI) ---\n');
  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${details}`);
    }
  }

  // 1. Setup users
  const customer = await login('customer@platform.com', 'CustomerPass123!');
  const agent = await login('agent@platform.com', 'AgentPass123!');
  const admin = await login('admin@platform.com', 'AdminPass123!');

  // Secondary customer for cross-tenant testing
  const rand = Math.floor(Math.random() * 10000);
  const otherCustomerRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: `Other User ${rand}`,
      email: `otherai${rand}@platform.com`,
      password: 'CustomerPass123!',
      department: 'Support',
    }
  );
  const otherCustomerToken = otherCustomerRes.data?.data?.token;

  // 2. Create sample tickets for deterministic classification testing
  // Ticket 1: Technical & Urgent
  const techTicketRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tickets',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.token}`,
      },
    },
    {
      title: 'Production 504 Gateway Timeout during checkout',
      description: 'Our checkout service is completely down with error 504. Payments are failing immediately and customers are furious!',
      category: 'general',
      priority: 'MEDIUM',
    }
  );
  const techTicket = techTicketRes.data?.data;
  assert(techTicketRes.status === 201 && techTicket?.ticketId, '1. Created technical test ticket');

  // 3. Test AI Analysis on Tech Ticket
  const techAnalysisRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${techTicket.ticketId}/ai/analyze`,
    method: 'POST',
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  const techAnalysis = techAnalysisRes.data?.data;
  assert(
    techAnalysisRes.status === 200 &&
    techAnalysis.suggestedCategory === 'technical' &&
    techAnalysis.suggestedPriority === 'URGENT' &&
    techAnalysis.sentiment === 'FRUSTRATED' &&
    techAnalysis.provider === 'mock' &&
    techAnalysis.isSimulated === true,
    '2. Deterministic AI Analysis detected technical category, URGENT priority, and FRUSTRATED sentiment',
    JSON.stringify(techAnalysis)
  );

  // 4. Test Cross-Customer Isolation: Customer B cannot analyze Customer A's ticket
  const crossCustRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${techTicket.ticketId}/ai/analyze`,
    method: 'POST',
    headers: { Authorization: `Bearer ${otherCustomerToken}` },
  });
  assert(
    crossCustRes.status === 403,
    '3. Customer B denied from analyzing Customer A ticket (403)',
    `Status received: ${crossCustRes.status} (Body: ${JSON.stringify(crossCustRes.data)})`
  );

  // 5. Test Customer denied from requesting staff reply suggestions
  const custReplyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${techTicket.ticketId}/ai/suggest-reply`,
    method: 'POST',
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  assert(custReplyRes.status === 403, '4. Customer strictly forbidden from requesting AI draft replies (403)');

  // 6. Agent requests suggested reply
  const agentReplyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${techTicket.ticketId}/ai/suggest-reply`,
    method: 'POST',
    headers: { Authorization: `Bearer ${agent.token}` },
  });
  const agentReply = agentReplyRes.data?.data;
  assert(
    agentReplyRes.status === 200 &&
    typeof agentReply?.suggestedReply === 'string' &&
    agentReply.suggestedReply.includes('Hello') &&
    agentReply.isSimulated === true &&
    typeof agentReply.rationale === 'string',
    '5. Agent successfully generated contextual AI suggested reply (Mock Provider)',
    agentReply?.suggestedReply
  );

  // 7. Agent applies AI suggestions
  const applyRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${techTicket.ticketId}/ai/apply`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.token}`,
      },
    },
    {
      suggestedCategory: techAnalysis.suggestedCategory,
      suggestedPriority: techAnalysis.suggestedPriority,
      sentiment: techAnalysis.sentiment,
      intent: techAnalysis.intent,
      summary: techAnalysis.summary,
      tags: techAnalysis.tags,
      applyCategory: true,
      applyPriority: true,
    }
  );
  const updatedTicket = applyRes.data?.data;
  assert(
    applyRes.status === 200 &&
    updatedTicket.category === 'technical' &&
    updatedTicket.priority === 'URGENT' &&
    updatedTicket.sentiment === 'FRUSTRATED' &&
    updatedTicket.intent === techAnalysis.intent &&
    updatedTicket.aiSummary === techAnalysis.summary,
    '6. Agent reviewed and applied AI suggestions (category, priority, sentiment, intent, summary)'
  );

  // 8. Security integrity check: customer and status were NOT altered by AI application
  const updatedCustId = (updatedTicket.customer?._id || updatedTicket.customer)?.toString();
  const originalCustId = (customer.user?._id || customer.user?.id)?.toString();
  assert(
    updatedCustId === originalCustId && updatedTicket.status === 'OPEN',
    '7. Security invariant verified: Ticket ownership and status remain strictly unchanged',
    `UpdatedCust: ${updatedCustId}, OriginalCust: ${originalCustId}`
  );

  // 9. Billing Ticket deterministic classification test
  const billingTicketRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tickets',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.token}`,
      },
    },
    {
      title: 'Monthly subscription invoice receipt request',
      description: 'Please send me the invoice breakdown and VAT receipt for our Stripe subscription charge. Thanks!',
      category: 'general',
      priority: 'LOW',
    }
  );
  const billingTicket = billingTicketRes.data?.data;
  const billingAnalysisRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${billingTicket.ticketId}/ai/analyze`,
    method: 'POST',
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  const billingAnalysis = billingAnalysisRes.data?.data;
  assert(
    billingAnalysisRes.status === 200 &&
    billingAnalysis.suggestedCategory === 'billing' &&
    billingAnalysis.sentiment === 'POSITIVE' &&
    billingAnalysis.tags.includes('billing'),
    '8. Deterministic analysis correctly classified billing inquiry with POSITIVE sentiment'
  );

  // 10. Unauthenticated request rejected
  const unauthRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${techTicket.ticketId}/ai/analyze`,
    method: 'POST',
  });
  assert(unauthRes.status === 401, '9. Unauthenticated request safely rejected with 401');

  console.log(`\n--- TEST SUMMARY: ${passed}/${total} PASSED ---`);
}

runAITests().catch(console.error);
