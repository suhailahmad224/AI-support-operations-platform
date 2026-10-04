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
  console.log('--- STARTING AUTH & RBAC VERIFICATION SUITE ---\n');
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
    // 0. Ensure demo accounts exist
    await request('POST', '/api/auth/seed');

    // Test 1: Register new customer
    const testEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Test Customer',
      email: testEmail,
      password: 'SecurePass123!',
      department: 'General',
    });
    assert(regRes.status === 201 && regRes.body.success && regRes.body.data.token, '1. Register new customer account (201)');
    const customerToken = regRes.body.data.token;

    // Test 2: Register duplicate email -> 409
    const dupRes = await request('POST', '/api/auth/register', {
      name: 'Duplicate User',
      email: testEmail,
      password: 'SecurePass123!',
    });
    assert(dupRes.status === 409 && !dupRes.body.success, '2. Reject duplicate email registration (409 Conflict)');

    // Test 3: Register validation failure (short password) -> 400
    const valRes = await request('POST', '/api/auth/register', {
      name: 'Val User',
      email: 'val@test.com',
      password: '123',
    });
    assert(valRes.status === 400 && !valRes.body.success, '3. Input validation reject short password (400)');

    // Test 4: Login with valid customer credentials
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'SecurePass123!',
    });
    assert(loginRes.status === 200 && loginRes.body.data.user.email === testEmail, '4. Customer login with valid credentials (200)');
    assert(loginRes.body.data.user.password === undefined, '4b. User password hash NOT exposed in response');

    // Test 5: Login with wrong password -> 401
    const wrongPassRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!',
    });
    assert(wrongPassRes.status === 401 && !wrongPassRes.body.success, '5. Reject invalid password (401)');

    // Test 6: Login with non-existent email -> 401
    const noUserRes = await request('POST', '/api/auth/login', {
      email: 'nonexistent@example.com',
      password: 'AnyPassword123!',
    });
    assert(noUserRes.status === 401 && !noUserRes.body.success, '6. Reject non-existent user login (401)');

    // Test 7: GET /api/auth/me without token -> 401
    const noTokenRes = await request('GET', '/api/auth/me');
    assert(noTokenRes.status === 401, '7. Protected endpoint rejects request without token (401)');

    // Test 8: GET /api/auth/me with invalid token -> 401
    const badTokenRes = await request('GET', '/api/auth/me', null, 'invalid.bearer.token');
    assert(badTokenRes.status === 401, '8. Protected endpoint rejects forged/invalid token (401)');

    // Test 9: GET /api/auth/me with valid token -> 200
    const meRes = await request('GET', '/api/auth/me', null, customerToken);
    assert(meRes.status === 200 && meRes.body.data.user.email === testEmail, '9. Retrieve current user profile via JWT (200)');

    // Test 10: Login Demo Agent
    const agentLoginRes = await request('POST', '/api/auth/login', {
      email: 'agent@platform.com',
      password: 'AgentPass123!',
    });
    assert(agentLoginRes.status === 200 && agentLoginRes.body.data.user.role === 'agent', '10. Agent demo account login (200)');
    const agentToken = agentLoginRes.body.data.token;

    // Test 11: Login Demo Admin
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@platform.com',
      password: 'AdminPass123!',
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.data.user.role === 'admin', '11. Admin demo account login (200)');
    const adminToken = adminLoginRes.body.data.token;

    // Test 12: RBAC - Customer accessing agent-only endpoint -> 403 Forbidden
    const custAgentOnlyRes = await request('GET', '/api/test/agent-only', null, customerToken);
    assert(custAgentOnlyRes.status === 403, '12. RBAC: Customer denied from Agent-only route (403 Forbidden)');

    // Test 13: RBAC - Agent accessing agent-only endpoint -> 200 Allowed
    const agentAgentOnlyRes = await request('GET', '/api/test/agent-only', null, agentToken);
    assert(agentAgentOnlyRes.status === 200, '13. RBAC: Agent granted access to Agent route (200 OK)');

    // Test 14: RBAC - Agent accessing admin-only endpoint -> 403 Forbidden
    const agentAdminOnlyRes = await request('GET', '/api/test/admin-only', null, agentToken);
    assert(agentAdminOnlyRes.status === 403, '14. RBAC: Agent denied from Admin-only route (403 Forbidden)');

    // Test 15: RBAC - Admin accessing admin-only endpoint -> 200 Allowed
    const adminAdminOnlyRes = await request('GET', '/api/test/admin-only', null, adminToken);
    assert(adminAdminOnlyRes.status === 200, '15. RBAC: Admin granted access to Admin route (200 OK)');

    console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
