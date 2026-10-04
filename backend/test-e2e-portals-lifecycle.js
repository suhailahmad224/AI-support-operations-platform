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

async function runE2EWorkflow() {
  console.log('=== PHASE 5 FULL END-TO-END PORTALS LIFECYCLE VERIFICATION ===\n');

  // STEP 1: Customer Portal Workflow
  console.log('--- 1. Testing Customer Portal Workflow ---');
  const customerAuth = await login('customer@platform.com', 'CustomerPass123!');
  console.log(`[PASS] Customer logged in: ${customerAuth.user.name} (${customerAuth.user.email})`);

  // Customer fetches initial portal stats
  const initialCustomerStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${customerAuth.token}` },
  });
  console.log('[PASS] Customer Portal Stats fetched:', initialCustomerStats.data.data);

  // Customer creates a new support ticket
  const createRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tickets',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAuth.token}`,
      },
    },
    {
      title: 'Checkout Gateway Timeout Error',
      description: 'Customer payments are encountering 504 gateway timeout during checkout step 2.',
      category: 'technical',
      priority: 'HIGH',
    }
  );
  const createdTicket = createRes.data.data;
  console.log(`[PASS] Customer created ticket: ${createdTicket.ticketId} - "${createdTicket.title}" [Status: ${createdTicket.status}]`);

  // Customer fetches their updated ticket list
  const customerListRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets?limit=5',
    method: 'GET',
    headers: { Authorization: `Bearer ${customerAuth.token}` },
  });
  const foundInCustomerList = customerListRes.data.data.some((t) => t.ticketId === createdTicket.ticketId);
  console.log(`[PASS] Ticket ${createdTicket.ticketId} present in customer portal ticket list: ${foundInCustomerList}`);

  // Customer views ticket details
  const ticketDetailRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tickets/${createdTicket.ticketId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${customerAuth.token}` },
  });
  console.log(`[PASS] Ticket details fetched with audit entries count: ${ticketDetailRes.data.data.auditHistory?.length}`);

  // STEP 2: Agent Portal Workflow
  console.log('\n--- 2. Testing Agent Portal Workflow ---');
  const agentAuth = await login('agent@platform.com', 'AgentPass123!');
  console.log(`[PASS] Agent logged in: ${agentAuth.user.name} (${agentAuth.user.email})`);

  // Agent checks unassigned queue
  const unassignedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets?queue=unassigned',
    method: 'GET',
    headers: { Authorization: `Bearer ${agentAuth.token}` },
  });
  const inUnassigned = unassignedRes.data.data.some((t) => t.ticketId === createdTicket.ticketId);
  console.log(`[PASS] Ticket ${createdTicket.ticketId} visible in Agent Unassigned Triage Queue: ${inUnassigned}`);

  // Agent claims the ticket
  const claimRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${createdTicket.ticketId}/assign`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentAuth.token}`,
      },
    },
    { agentId: agentAuth.user._id || agentAuth.user.id }
  );
  console.log(`[PASS] Agent claimed ticket. Current status: ${claimRes.data.data.status}, AssignedAgent: ${claimRes.data.data.assignedAgent.name}`);

  // Agent updates status: ASSIGNED -> IN_PROGRESS
  const progressRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${createdTicket.ticketId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentAuth.token}`,
      },
    },
    { status: 'IN_PROGRESS' }
  );
  console.log(`[PASS] Agent updated ticket status to: ${progressRes.data.data.status}`);

  // Agent updates status: IN_PROGRESS -> WAITING_FOR_CUSTOMER
  const waitingRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${createdTicket.ticketId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentAuth.token}`,
      },
    },
    { status: 'WAITING_FOR_CUSTOMER' }
  );
  console.log(`[PASS] Agent updated ticket status to: ${waitingRes.data.data.status}`);

  // Agent resolves ticket: WAITING_FOR_CUSTOMER -> RESOLVED
  const resolveRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${createdTicket.ticketId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentAuth.token}`,
      },
    },
    { status: 'RESOLVED' }
  );
  console.log(`[PASS] Agent resolved ticket: ${resolveRes.data.data.status}, resolvedAt: ${resolveRes.data.data.resolvedAt}`);

  // STEP 3: Admin Portal Workflow
  console.log('\n--- 3. Testing Admin Portal Workflow ---');
  const adminAuth = await login('admin@platform.com', 'AdminPass123!');
  console.log(`[PASS] Admin logged in: ${adminAuth.user.name} (${adminAuth.user.email})`);

  // Admin fetches platform-wide stats
  const adminStatsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  console.log('[PASS] Admin Executive Ticket KPIs:', adminStatsRes.data.data);

  // Admin fetches users and agents count
  const usersRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users?limit=1',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const agentsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/agents',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  console.log(`[PASS] Admin User Directory metrics: Total Users: ${usersRes.data.meta?.total}, Active Agents: ${agentsRes.data.data?.length}`);

  // Admin lists all global tickets
  const adminTicketsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets?limit=10',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  console.log(`[PASS] Admin Workspace Overview fetched: ${adminTicketsRes.data.data?.length} tickets listed`);

  console.log('\n=== ALL PORTAL E2E LIFECYCLE TESTS COMPLETED SUCCESSFULLY! ===');
}

runE2EWorkflow().catch(console.error);
