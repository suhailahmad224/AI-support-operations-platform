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
  return res.data?.data?.token;
}

async function run() {
  console.log('--- TESTING PORTALS /api/tickets/stats API ---');
  let passed = 0;

  // 1. Admin Stats
  const adminToken = await login('admin@platform.com', 'AdminPass123!');
  const adminStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (adminStats.status === 200 && adminStats.data.success && typeof adminStats.data.data.total === 'number') {
    console.log('[PASS] Admin stats returned total, open, inProgress, etc.');
    passed++;
  } else {
    console.error('[FAIL] Admin stats failed', adminStats);
  }

  // 2. Agent Stats
  const agentToken = await login('agent@platform.com', 'AgentPass123!');
  const agentStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${agentToken}` },
  });
  if (agentStats.status === 200 && agentStats.data.success && typeof agentStats.data.data.myAssigned === 'number') {
    console.log('[PASS] Agent stats returned myAssigned, unassignedQueue, etc.');
    passed++;
  } else {
    console.error('[FAIL] Agent stats failed', agentStats);
  }

  // 3. Customer Stats
  const customerToken = await login('customer@platform.com', 'CustomerPass123!');
  const customerStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (customerStats.status === 200 && customerStats.data.success && typeof customerStats.data.data.total === 'number') {
    console.log('[PASS] Customer stats returned total, open, resolved, etc.');
    passed++;
  } else {
    console.error('[FAIL] Customer stats failed', customerStats);
  }

  // 4. Unauthorized rejection
  const unauth = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/stats',
    method: 'GET',
  });
  if (unauth.status === 401) {
    console.log('[PASS] Unauthenticated request safely rejected with 401');
    passed++;
  } else {
    console.error('[FAIL] Unauthenticated request did not return 401', unauth);
  }

  console.log(`--- SUMMARY: ${passed}/4 PASSED ---`);
}

run().catch(console.error);
