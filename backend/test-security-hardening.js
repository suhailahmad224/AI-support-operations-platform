/**
 * Phase 10: Security Hardening Automated Verification Suite
 * Tests NoSQL Injection, ReDoS Protection, Internal Notes Privacy,
 * Agent Assignment Policy Boundaries, Cross-Customer Isolation,
 * Attachment Hardening, Error Sanitization, and Session Logout.
 */

const http = require('http');

function apiCall(options, data) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        ...options,
        headers: { ...defaultHeaders, ...(options.headers || {}) },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login(email, password) {
  const res = await apiCall(
    { path: '/api/auth/login', method: 'POST' },
    { email, password }
  );
  return { token: res.data?.data?.token, user: res.data?.data?.user };
}

async function runSecurityTests() {
  console.log('\n--- STARTING PHASE 10: SECURITY HARDENING VERIFICATION SUITE ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 0. Establish Sessions
    const admin = await login('admin@platform.com', 'AdminPass123!');
    const agent1 = await login('agent@platform.com', 'AgentPass123!');
    const cust1 = await login('customer@platform.com', 'CustomerPass123!');

    // Create a second customer and second agent for cross-account boundary tests
    const cust2Email = `cust.sec.${Date.now()}@example.com`;
    const regCust2 = await apiCall(
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Customer Two', email: cust2Email, password: 'CustomerPass123!' }
    );
    const cust2Token = regCust2.data?.data?.token;

    const agent2Email = `agent.sec.${Date.now()}@platform.com`;
    const createAgent2 = await apiCall(
      {
        path: '/api/users',
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.token}` },
      },
      {
        name: 'Agent Two',
        email: agent2Email,
        password: 'AgentPass123!',
        role: 'agent',
        department: 'Support',
      }
    );
    const agent2 = await login(agent2Email, 'AgentPass123!');

    assert(admin.token && agent1.token && cust1.token && cust2Token && agent2.token, 'Test accounts and tokens successfully initialized');

    // 1. Security Headers & CORS
    const healthRes = await apiCall({ path: '/api/health', method: 'GET' });
    const hasHelmet = healthRes.headers['x-content-type-options'] === 'nosniff' &&
                      healthRes.headers['x-frame-options'] === 'SAMEORIGIN';
    assert(hasHelmet, '1. Security headers present (X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN)');

    // 2. NoSQL Injection Prevention: Operator injection in login
    const nosqlRes = await apiCall(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'customer@platform.com', password: { $gt: '' } }
    );
    assert(
      nosqlRes.status === 400 || nosqlRes.status === 401,
      `2. NoSQL injection operator in payload safely stripped and rejected (${nosqlRes.status})`
    );

    // 3. ReDoS Protection: Malicious regular expression metacharacters in search
    const maliciousReDoS = '((((((((((a+)+)+)+)+)+)+)+)+)+)$';
    const searchRes = await apiCall({
      path: `/api/tickets?search=${encodeURIComponent(maliciousReDoS)}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${cust1.token}` },
    });
    assert(
      searchRes.status === 200 && searchRes.data?.success === true,
      '3. ReDoS query safely escaped with escapeRegex, avoiding catastrophic backtracking'
    );

    // 4. Ticket Creation & Confidential Note Privacy in Audit Logs
    const createTicketRes = await apiCall(
      {
        path: '/api/tickets',
        method: 'POST',
        headers: { Authorization: `Bearer ${cust1.token}` },
      },
      {
        title: 'Sensitive Security Investigation',
        description: 'Customer inquiry into potential unauthorized access attempt.',
        category: 'technical',
        priority: 'HIGH',
      }
    );
    const ticket = createTicketRes.data?.data;
    assert(createTicketRes.status === 201 && ticket?.ticketId, '4. Customer 1 created ticket for privacy testing');

    // Agent 1 claims ticket
    const claimRes = await apiCall({
      path: `/api/tickets/${ticket.ticketId}/assign`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${agent1.token}` },
    });
    assert(claimRes.status === 200, '5. Agent 1 claimed ticket');

    // Agent 1 posts a confidential staff internal note
    const secretContent = `TOP-SECRET-AUDIT-NOTE-${Date.now()}: Customer flagged for risk assessment.`;
    const noteRes = await apiCall(
      {
        path: `/api/tickets/${ticket.ticketId}/messages`,
        method: 'POST',
        headers: { Authorization: `Bearer ${agent1.token}` },
      },
      {
        message: secretContent,
        isInternal: true,
      }
    );
    assert((noteRes.status === 201 || noteRes.status === 200) && noteRes.data?.data?.isInternal === true, '6. Agent 1 added private internal note (201 Created)');

    // Customer 1 retrieves ticket details (GET /api/tickets/:id)
    const custViewRes = await apiCall({
      path: `/api/tickets/${ticket.ticketId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${cust1.token}` },
    });
    const auditLogs = custViewRes.data?.data?.auditHistory || [];
    const leaksInternalAudit = auditLogs.some(
      (entry) =>
        entry.action === 'INTERNAL_NOTE_ADDED' ||
        entry.details?.isInternal === true ||
        JSON.stringify(entry).includes(secretContent)
    );
    assert(!leaksInternalAudit, '7. Audit logs in ticket details strictly hide INTERNAL_NOTE_ADDED from customer');

    // Customer 1 retrieves messages (GET /api/tickets/:id/messages)
    const custMessagesRes = await apiCall({
      path: `/api/tickets/${ticket.ticketId}/messages`,
      method: 'GET',
      headers: { Authorization: `Bearer ${cust1.token}` },
    });
    const messages = custMessagesRes.data?.data || [];
    const leaksInternalMessage = messages.some((m) => m.isInternal === true || m.message.includes(secretContent));
    assert(!leaksInternalMessage, '8. Customer message thread strictly isolates customer-facing messages from internal notes');

    // 9. Agent Assignment Boundary: Agent 2 blocked from claiming Agent 1 assigned ticket
    const agent2Hijack = await apiCall({
      path: `/api/tickets/${ticket.ticketId}/assign`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${agent2.token}` },
    });
    assert(agent2Hijack.status === 403, '9. Agent 2 blocked from hijacking Agent 1 assigned ticket (403 Forbidden)');

    // 10. Agent Assignment Boundary: Agent 2 blocked from updating Agent 1 ticket content
    const agent2Edit = await apiCall(
      {
        path: `/api/tickets/${ticket.ticketId}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${agent2.token}` },
      },
      { title: 'Malicious title modification' }
    );
    assert(agent2Edit.status === 403, '10. Agent 2 blocked from editing Agent 1 ticket content (403 Forbidden)');

    // 11. Agent Assignment Boundary: Agent 2 blocked from applying AI analysis to Agent 1 ticket
    const agent2AiApply = await apiCall(
      {
        path: `/api/tickets/${ticket.ticketId}/ai/apply`,
        method: 'POST',
        headers: { Authorization: `Bearer ${agent2.token}` },
      },
      { sentiment: 'POSITIVE' }
    );
    assert(agent2AiApply.status === 403, '11. Agent 2 blocked from applying AI analysis to Agent 1 ticket (403 Forbidden)');

    // 12. Cross-Customer Isolation: Customer 2 blocked from accessing Customer 1 ticket
    const cust2ViewRes = await apiCall({
      path: `/api/tickets/${ticket.ticketId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${cust2Token}` },
    });
    assert(cust2ViewRes.status === 403, '12. Customer 2 blocked from viewing Customer 1 ticket details (403 Forbidden)');

    const cust2MsgRes = await apiCall(
      {
        path: `/api/tickets/${ticket.ticketId}/messages`,
        method: 'POST',
        headers: { Authorization: `Bearer ${cust2Token}` },
      },
      { message: 'Intruder message' }
    );
    assert(cust2MsgRes.status === 403, '13. Customer 2 blocked from messaging on Customer 1 ticket (403 Forbidden)');

    // 14. Attachment Validation & Path Traversal Block
    const traversalRes = await apiCall(
      {
        path: `/api/tickets/${ticket.ticketId}/messages`,
        method: 'POST',
        headers: { Authorization: `Bearer ${cust1.token}` },
      },
      {
        message: 'Malicious path traversal attachment',
        attachments: ['../../etc/passwd', 'legit.pdf'],
      }
    );
    assert(
      traversalRes.status === 400 && traversalRes.data?.error?.message?.includes('Invalid attachment path'),
      '14. Path traversal sequence "../" in attachments rejected (400 Bad Request)'
    );

    // 15. CastError Sanitization: Invalid ID returns clean message without raw input reflection
    const invalidIdRes = await apiCall({
      path: '/api/users/malicious-inject-<script>-id',
      method: 'GET',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(
      invalidIdRes.status === 400 &&
      invalidIdRes.data?.error?.message === 'Invalid resource identifier format' &&
      !JSON.stringify(invalidIdRes.data).includes('<script>'),
      '15. CastError returns generic message without reflecting user input or script tags'
    );

    // 16. Session Logout Endpoint
    const logoutRes = await apiCall({
      path: '/api/auth/logout',
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1.token}` },
    });
    assert(logoutRes.status === 200 && logoutRes.data?.success === true, '16. Authenticated session logged out cleanly (200 OK)');

  } catch (err) {
    console.error('Unexpected test execution error:', err);
    failed++;
  }

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runSecurityTests();
