const http = require('http');

const PORT = 5000;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (dataString) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING TICKET MANAGEMENT SYSTEM VERIFICATION SUITE ---\n');
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
    // 0. Ensure seed accounts exist
    await request('POST', '/api/auth/seed');

    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@platform.com',
      password: 'AdminPass123!',
    });
    const adminToken = adminLogin.body.data.token;

    const agentLogin = await request('POST', '/api/auth/login', {
      email: 'agent@platform.com',
      password: 'AgentPass123!',
    });
    const agentToken = agentLogin.body.data.token;
    const agentId = agentLogin.body.data.user.id;

    const custALogin = await request('POST', '/api/auth/login', {
      email: 'customer@platform.com',
      password: 'CustomerPass123!',
    });
    const custAToken = custALogin.body.data.token;
    const custAId = custALogin.body.data.user.id;

    // Register second customer for isolation testing
    const custBEmail = `custb_${Date.now()}@platform.com`;
    const custBReg = await request('POST', '/api/auth/register', {
      name: 'Customer Bob',
      email: custBEmail,
      password: 'CustomerPass123!',
    });
    const custBToken = custBReg.body.data.token;

    // Test 1: Customer A creates ticket
    const createRes = await request('POST', '/api/tickets', {
      title: 'Database connection latency spike',
      description: 'We are observing significant response latency on the primary replica.',
      category: 'technical',
      priority: 'HIGH',
      status: 'RESOLVED', // Attempt injection
      assignedAgent: agentId, // Attempt injection
    }, custAToken);

    assert(createRes.status === 201 && createRes.body.success, '1. Customer A creates a new support ticket (201)');
    const ticket = createRes.body.data;
    assert(ticket.ticketId && ticket.ticketId.startsWith('TCK-'), '1b. Generated human-readable unique ticketId (TCK-XXXXX)');
    assert(ticket.status === 'OPEN', '1c. Status injection blocked: forced to OPEN');
    assert(ticket.assignedAgent === null, '1d. Agent injection blocked: forced to null');
    assert(ticket.customer.email === 'customer@platform.com', '1e. Customer ownership strictly verified from session');

    // Test 2: Input validation check
    const badTicketRes = await request('POST', '/api/tickets', {
      title: 'Hi',
      description: 'Too short',
    }, custAToken);
    assert(badTicketRes.status === 400 && !badTicketRes.body.success, '2. Input validator rejects short title & description (400)');

    // Test 3: Customer A lists tickets (sees created ticket)
    const listARes = await request('GET', '/api/tickets', null, custAToken);
    assert(listARes.status === 200 && listARes.body.data.some(t => t.ticketId === ticket.ticketId), '3. Customer A lists tickets and sees own ticket (200)');

    // Test 4: Customer B lists tickets (cannot see Customer A's ticket)
    const listBRes = await request('GET', '/api/tickets', null, custBToken);
    assert(listBRes.status === 200 && !listBRes.body.data.some(t => t.ticketId === ticket.ticketId), '4. Customer B list isolated: cannot see Customer A ticket (200)');

    // Test 5: Customer B cannot view Customer A's ticket details -> 403 Forbidden
    const detailBRes = await request('GET', `/api/tickets/${ticket.ticketId}`, null, custBToken);
    assert(detailBRes.status === 403, '5. Security guard: Customer B blocked from viewing Customer A ticket (403)');

    // Test 6: Agent views unassigned queue
    const unassignedRes = await request('GET', '/api/tickets?queue=unassigned', null, agentToken);
    assert(unassignedRes.status === 200 && unassignedRes.body.data.some(t => t.ticketId === ticket.ticketId), '6. Agent views unassigned ticket queue (200)');

    // Test 7: Agent claims ticket -> Status moves to ASSIGNED
    const claimRes = await request('PATCH', `/api/tickets/${ticket.ticketId}/assign`, {
      agentId,
    }, agentToken);
    assert(claimRes.status === 200 && claimRes.body.data.status === 'ASSIGNED', '7. Agent claims ticket: moves OPEN -> ASSIGNED (200)');
    assert(claimRes.body.data.assignedAgent.name === 'Alex Support Agent', '7b. Ticket assignedAgent populated with agent details');

    // Test 8: Invalid state machine transition: OPEN to RESOLVED
    const badTransRes = await request('PATCH', `/api/tickets/${ticket.ticketId}/status`, {
      status: 'OPEN',
    }, agentToken);
    // ASSIGNED -> OPEN is allowed, but let's test invalid transition ASSIGNED -> RESOLVED (not in allowed list)
    const invalidTransRes = await request('PATCH', `/api/tickets/${ticket.ticketId}/status`, {
      status: 'RESOLVED',
    }, agentToken);
    assert(invalidTransRes.status === 400 && !invalidTransRes.body.success, '8. State machine rejects invalid transition from ASSIGNED to RESOLVED (400)');

    // Test 9: Valid transition ASSIGNED -> IN_PROGRESS
    const inProgRes = await request('PATCH', `/api/tickets/${ticket.ticketId}/status`, {
      status: 'IN_PROGRESS',
    }, agentToken);
    assert(inProgRes.status === 200 && inProgRes.body.data.status === 'IN_PROGRESS', '9. Valid status transition: ASSIGNED -> IN_PROGRESS (200)');

    // Test 10: Valid transition IN_PROGRESS -> WAITING_FOR_CUSTOMER
    const waitingRes = await request('PATCH', `/api/tickets/${ticket.ticketId}/status`, {
      status: 'WAITING_FOR_CUSTOMER',
    }, agentToken);
    assert(waitingRes.status === 200 && waitingRes.body.data.status === 'WAITING_FOR_CUSTOMER', '10. Valid status transition: IN_PROGRESS -> WAITING_FOR_CUSTOMER (200)');

    // Test 11: Valid transition WAITING_FOR_CUSTOMER -> RESOLVED
    const resolvedRes = await request('PATCH', `/api/tickets/${ticket.ticketId}/status`, {
      status: 'RESOLVED',
    }, agentToken);
    assert(resolvedRes.status === 200 && resolvedRes.body.data.status === 'RESOLVED', '11. Valid status transition: WAITING_FOR_CUSTOMER -> RESOLVED (200)');
    assert(resolvedRes.body.data.resolvedAt !== null, '11b. ResolvedAt lifecycle timestamp automatically set');

    // Test 12: Customer closes their own resolved ticket
    const closedRes = await request('PATCH', `/api/tickets/${ticket.ticketId}/status`, {
      status: 'CLOSED',
    }, custAToken);
    assert(closedRes.status === 200 && closedRes.body.data.status === 'CLOSED', '12. Customer closes resolved ticket: RESOLVED -> CLOSED (200)');
    assert(closedRes.body.data.closedAt !== null, '12b. ClosedAt lifecycle timestamp automatically set');

    // Test 13: Ticket details & Audit Log History
    const detailRes = await request('GET', `/api/tickets/${ticket.ticketId}`, null, custAToken);
    assert(detailRes.status === 200 && detailRes.body.data.auditHistory.length >= 3, '13. Ticket details endpoint includes immutable audit history log (200)');

    // Test 14: Search by Ticket ID and Category
    const searchRes = await request('GET', `/api/tickets?search=${ticket.ticketId}&category=technical`, null, adminToken);
    assert(searchRes.status === 200 && searchRes.body.data.length === 1, '14. Search by ticketId and category filter works accurately (200)');

    // Test 15: Non-existent ticket returns 404
    const notFoundRes = await request('GET', '/api/tickets/TCK-99999', null, adminToken);
    assert(notFoundRes.status === 404, '15. Non-existent ticket ID returns 404 Not Found');

    // Test 16: Admin deletes ticket
    const deleteRes = await request('DELETE', `/api/tickets/${ticket.ticketId}`, null, adminToken);
    assert(deleteRes.status === 200 && deleteRes.body.success, '16. Admin deletes ticket (200)');

    console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
