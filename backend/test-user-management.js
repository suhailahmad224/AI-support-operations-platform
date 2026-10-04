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
  console.log('--- STARTING USER & AGENT MANAGEMENT VERIFICATION SUITE ---\n');
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
    // 0. Ensure demo accounts exist & login
    await request('POST', '/api/auth/seed');

    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@platform.com',
      password: 'AdminPass123!',
    });
    const adminToken = adminLogin.body.data.token;
    const adminId = adminLogin.body.data.user.id;

    const agentLogin = await request('POST', '/api/auth/login', {
      email: 'agent@platform.com',
      password: 'AgentPass123!',
    });
    const agentToken = agentLogin.body.data.token;

    const customerLogin = await request('POST', '/api/auth/login', {
      email: 'customer@platform.com',
      password: 'CustomerPass123!',
    });
    const customerToken = customerLogin.body.data.token;
    const customerId = customerLogin.body.data.user.id;

    // Test 1: Customer blocked from GET /api/users
    const custUsers = await request('GET', '/api/users', null, customerToken);
    assert(custUsers.status === 403, '1. Customer denied from GET /api/users (403)');

    // Test 2: Agent blocked from GET /api/users
    const agentUsers = await request('GET', '/api/users', null, agentToken);
    assert(agentUsers.status === 403, '2. Agent denied from GET /api/users (403)');

    // Test 3: Admin allowed to list users with pagination
    const adminUsers = await request('GET', '/api/users?page=1&limit=5', null, adminToken);
    assert(adminUsers.status === 200 && adminUsers.body.meta && Array.isArray(adminUsers.body.data), '3. Admin lists users with pagination meta (200)');

    // Test 4: Search filter
    const searchRes = await request('GET', '/api/users?search=Jane', null, adminToken);
    const hasJane = searchRes.body.data.some(u => u.name.includes('Jane'));
    assert(searchRes.status === 200 && hasJane, '4. Search query filter finds user by name (200)');

    // Test 5: Role filter
    const roleFilterRes = await request('GET', '/api/users?role=agent', null, adminToken);
    const allAgents = roleFilterRes.body.data.every(u => u.role === 'agent');
    assert(roleFilterRes.status === 200 && allAgents, '5. Role filter retrieves only agents (200)');

    // Test 6: Admin creates new agent
    const newAgentEmail = `test_agent_${Date.now()}@platform.com`;
    const createRes = await request('POST', '/api/users', {
      name: 'Tier 2 Agent',
      email: newAgentEmail,
      password: 'AgentPass123!',
      role: 'agent',
      department: 'Engineering',
    }, adminToken);
    assert(createRes.status === 201 && createRes.body.data.role === 'agent', '6. Admin creates new agent account (201)');
    const createdAgentId = createRes.body.data.id;

    // Test 7: Customer cannot create user
    const custCreate = await request('POST', '/api/users', {
      name: 'Hacker',
      email: 'hacker@test.com',
      password: 'Password123!',
      role: 'admin',
    }, customerToken);
    assert(custCreate.status === 403, '7. Customer blocked from creating user/escalating role (403)');

    // Test 8: Admin updates agent workload & department
    const updateRes = await request('PUT', `/api/users/${createdAgentId}`, {
      department: 'Support',
      assignedTicketsCount: 3,
    }, adminToken);
    assert(updateRes.status === 200 && updateRes.body.data.assignedTicketsCount === 3, '8. Admin updates agent department & workload count (200)');

    // Test 9: Admin toggles agent active status
    const toggleRes = await request('PATCH', `/api/users/${createdAgentId}/status`, null, adminToken);
    assert(toggleRes.status === 200 && toggleRes.body.data.isActive === false, '9. Admin toggles agent status to inactive (200)');

    // Test 10: Customer cannot toggle status
    const custToggle = await request('PATCH', `/api/users/${createdAgentId}/status`, null, customerToken);
    assert(custToggle.status === 403, '10. Customer blocked from toggling status (403)');

    // Test 11: Admin safety guard: cannot deactivate self
    const selfToggle = await request('PATCH', `/api/users/${adminId}/status`, null, adminToken);
    assert(selfToggle.status === 400 && !selfToggle.body.success, '11. Safety guard prevents admin from deactivating self (400)');

    // Test 12: Customer reads own profile via /profile/me
    const myProfileRes = await request('GET', '/api/users/profile/me', null, customerToken);
    assert(myProfileRes.status === 200 && myProfileRes.body.data.id === customerId, '12. Customer reads own profile via /profile/me (200)');

    // Test 13: Customer updates own profile name
    const updateProfileRes = await request('PUT', '/api/users/profile/me', {
      name: 'Jane Customer Updated',
      role: 'admin', // Should be stripped/ignored
    }, customerToken);
    assert(updateProfileRes.status === 200 && updateProfileRes.body.data.name === 'Jane Customer Updated', '13. Customer updates own profile (200)');
    assert(updateProfileRes.body.data.role === 'customer', '13b. Privilege escalation strictly prevented in profile update');

    // Test 14: GET /api/agents directory accessible by Agent & Admin
    const agentsDir = await request('GET', '/api/agents', null, agentToken);
    assert(agentsDir.status === 200 && Array.isArray(agentsDir.body.data), '14. Agents directory accessible by Agent with workload counters (200)');

    // Test 15: Admin deletes test agent
    const deleteRes = await request('DELETE', `/api/users/${createdAgentId}`, null, adminToken);
    assert(deleteRes.status === 200 && deleteRes.body.success, '15. Admin deletes user account (200)');

    // Test 16: Admin cannot delete self
    const deleteSelf = await request('DELETE', `/api/users/${adminId}`, null, adminToken);
    assert(deleteSelf.status === 400, '16. Safety guard prevents admin from deleting self (400)');

    console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
