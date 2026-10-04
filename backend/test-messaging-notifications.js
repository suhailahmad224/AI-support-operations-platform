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

async function runMessagingTests() {
  console.log('--- STARTING MESSAGING, INTERNAL NOTES & NOTIFICATIONS TEST SUITE ---\n');
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

  // Register a secondary customer to test customer isolation
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
      name: `Other Customer ${rand}`,
      email: `other${rand}@platform.com`,
      password: 'CustomerPass123!',
      department: 'Support',
    }
  );
  const otherCustomerToken = otherCustomerRes.data?.data?.token;

  // 2. Customer creates a ticket
  const ticketRes = await request(
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
      title: 'Payment Receipt Missing',
      description: 'I did not receive an invoice or payment receipt for my recent order.',
      category: 'billing',
      priority: 'MEDIUM',
    }
  );
  const ticket = ticketRes.data?.data;
  assert(ticketRes.status === 201 && ticket?.ticketId, '1. Customer created ticket for conversation test');

  // 3. Customer posts public message
  const custMsgRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticket.ticketId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.token}`,
      },
    },
    {
      message: 'Here is my transaction reference: TXN-998822.',
      isInternal: false,
    }
  );
  assert(custMsgRes.status === 201 && custMsgRes.data.data.isInternal === false, '2. Customer posted public message');

  // 4. Customer tries to post an internal note -> Security guard blocks (403)
  const custInternalRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticket.ticketId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.token}`,
      },
    },
    {
      message: 'This is an unauthorized internal note attempt.',
      isInternal: true,
    }
  );
  assert(custInternalRes.status === 403, '3. Customer strictly forbidden from creating internal note (403)');

  // 5. Other customer tries to message on Customer A's ticket -> 403 Forbidden
  const otherCustMsgRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticket.ticketId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherCustomerToken}`,
      },
    },
    {
      message: 'Unauthorized snooping message.',
    }
  );
  assert(otherCustMsgRes.status === 403, '4. Other customer blocked from posting to alien ticket (403)');

  // 6. Agent claims ticket
  const claimRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticket.ticketId}/assign`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.token}`,
      },
    },
    { agentId: agent.user._id || agent.user.id }
  );
  assert(claimRes.status === 200, '5. Agent claimed ticket');

  // 7. Agent posts a private internal note
  const agentNoteRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticket.ticketId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.token}`,
      },
    },
    {
      message: 'Internal review: Payment was processed via Stripe batch #4041. Refund not required.',
      isInternal: true,
    }
  );
  assert(agentNoteRes.status === 201 && agentNoteRes.data.data.isInternal === true, '6. Agent posted private internal note');

  // 8. Agent posts a public customer response
  const agentPublicRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticket.ticketId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.token}`,
      },
    },
    {
      message: 'Hello! I have generated your PDF receipt and attached it to your account.',
      isInternal: false,
    }
  );
  assert(agentPublicRes.status === 201 && agentPublicRes.data.data.isInternal === false, '7. Agent posted public reply');

  // 9. Customer views conversation -> MUST NOT see internal note
  const custViewRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${ticket.ticketId}/messages`,
    method: 'GET',
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  const custMessages = custViewRes.data?.data || [];
  const containsInternalInCust = custMessages.some((m) => m.isInternal === true);
  assert(
    custViewRes.status === 200 && custMessages.length === 2 && !containsInternalInCust,
    '8. Customer retrieves conversation with internal notes completely hidden',
    `Found internal notes: ${containsInternalInCust}, count: ${custMessages.length}`
  );

  // 10. Agent views conversation -> MUST see both public and internal notes
  const agentViewRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${ticket.ticketId}/messages`,
    method: 'GET',
    headers: { Authorization: `Bearer ${agent.token}` },
  });
  const agentMessages = agentViewRes.data?.data || [];
  const internalCountInAgent = agentMessages.filter((m) => m.isInternal === true).length;
  assert(
    agentViewRes.status === 200 && agentMessages.length === 3 && internalCountInAgent === 1,
    '9. Agent retrieves full conversation including internal note',
    `Count: ${agentMessages.length}, Internal: ${internalCountInAgent}`
  );

  // 11. Customer checks notifications
  const custNotifsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications',
    method: 'GET',
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  const custNotifs = custNotifsRes.data?.data?.notifications || [];
  assert(
    custNotifsRes.status === 200 && custNotifs.length > 0,
    '10. Customer received notifications for agent reply and assignment'
  );

  // 12. Check unread count
  const unreadRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications/unread-count',
    method: 'GET',
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  assert(
    unreadRes.status === 200 && typeof unreadRes.data?.data?.unreadCount === 'number',
    '11. Unread count endpoint returns accurate numerical count'
  );

  // 13. Mark single notification as read
  const firstNotifId = custNotifs[0]?._id;
  if (firstNotifId) {
    const markReadRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notifications/${firstNotifId}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert(markReadRes.status === 200 && markReadRes.data.data.notification.isRead === true, '12. Marked single notification as read');
  }

  // 14. Mark all as read
  const markAllRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications/read-all',
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customer.token}` },
  });
  assert(markAllRes.status === 200 && markAllRes.data.data.unreadCount === 0, '13. Marked all notifications as read (unread count reset to 0)');

  // 15. Validation rejects empty message
  const emptyMsgRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticket.ticketId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.token}`,
      },
    },
    { message: '   ' }
  );
  assert(emptyMsgRes.status === 400, '14. Input validation rejects empty whitespace message (400)');

  console.log(`\n--- TEST SUMMARY: ${passed}/${total} PASSED ---`);
}

runMessagingTests().catch(console.error);
