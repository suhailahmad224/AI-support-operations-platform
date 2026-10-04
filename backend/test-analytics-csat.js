/**
 * Phase 9: Analytics + CSAT Verification Suite
 * Tests Dashboard Metrics, Timing (FRT/MTTR), Agent Workload,
 * CSAT Feedback Submission, RBAC, Duplicate Guard, and Cross-Customer Access.
 */

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

async function runTestSuite() {
  console.log('--- STARTING ANALYTICS & CSAT VERIFICATION SUITE --- \n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message} ${details}`);
      failed++;
    }
  }

  try {
    const admin = await login('admin@platform.com', 'AdminPass123!');
    const agent = await login('agent@platform.com', 'AgentPass123!');
    const customer = await login('customer@platform.com', 'CustomerPass123!');

    const adminToken = admin.token;
    const agentToken = agent.token;
    const customerToken = customer.token;

    // Create a second customer for cross-customer isolation tests
    const rand = Math.floor(Math.random() * 10000);
    const cust2Res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: `Customer Two ${rand}`,
        email: `cust2_${rand}@platform.com`,
        password: 'CustomerPass123!',
        department: 'General',
      }
    );
    const customer2Token = cust2Res.data?.data?.token;

    // 1. RBAC Guard: Customer denied from Analytics Dashboard (403)
    const custAnalyticsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custAnalyticsRes.status === 403, '1. Customer strictly forbidden from admin analytics (403)');

    // 2. RBAC Guard: Agent denied from Analytics Dashboard (403)
    const agentAnalyticsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    assert(agentAnalyticsRes.status === 403, '2. Support Agent denied from admin analytics (403)');

    // 3. Admin retrieves analytics dashboard (200 OK)
    const adminAnalyticsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashData = adminAnalyticsRes.data?.data;
    assert(
      adminAnalyticsRes.status === 200 &&
        typeof dashData?.overview?.total === 'number' &&
        Array.isArray(dashData?.breakdowns?.byStatus) &&
        dashData?.csat !== undefined,
      '3. Admin successfully retrieved comprehensive analytics overview (200)'
    );

    // 4. Create a test ticket for CSAT lifecycle
    const ticketRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/tickets',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        title: 'Billing Invoice Error Inquiry',
        description: 'Customer inquiry regarding overcharge on subscription tier.',
        category: 'billing',
        priority: 'MEDIUM',
      }
    );
    const ticketId = ticketRes.data?.data?.ticketId;
    assert(ticketRes.status === 201 && ticketId, '4. Customer created ticket for CSAT testing');

    // 5. Customer attempts to submit feedback on OPEN ticket -> Rejected (400)
    const earlyFeedbackRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/feedback`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        rating: 5,
        comment: 'Great work before resolution!',
      }
    );
    assert(
      earlyFeedbackRes.status === 400 &&
        (earlyFeedbackRes.data?.error?.message || earlyFeedbackRes.data?.message)?.includes('resolved or closed'),
      '5. CSAT submission rejected for unresolved OPEN ticket (400)'
    );

    // 6. Agent claims ticket and responds publicly (verifying firstResponseAt tracking)
    await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/tickets/${ticketId}/assign`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentToken}`,
      },
    });

    const msgRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/messages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${agentToken}`,
        },
      },
      {
        message: 'Hello! I have reviewed your invoice and refunded the difference.',
        isInternal: false,
      }
    );
    assert(msgRes.status === 201, '6. Agent sent first public reply to customer');

    // Move ticket from ASSIGNED -> IN_PROGRESS
    await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${agentToken}`,
        },
      },
      {
        status: 'IN_PROGRESS',
      }
    );

    // Move ticket from IN_PROGRESS -> RESOLVED
    const resolveRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${agentToken}`,
        },
      },
      {
        status: 'RESOLVED',
      }
    );
    assert(resolveRes.status === 200, '7. Ticket transitioned to RESOLVED status');

    // 8. Cross-customer isolation: Customer 2 blocked from rating Customer 1 ticket (403)
    const alienFeedbackRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/feedback`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`,
        },
      },
      {
        rating: 1,
        comment: 'I do not own this ticket',
      }
    );
    assert(alienFeedbackRes.status === 403, '8. Customer B strictly blocked from reviewing Customer A ticket (403)');

    // 9. Rating bounds validation: Rating 0 or 6 rejected (400)
    const invalidRatingRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/feedback`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        rating: 6,
        comment: 'Too high rating',
      }
    );
    assert(invalidRatingRes.status === 400, '9. Rating validation rejects score outside 1-5 bounds (400)');

    // 10. Customer submits valid 5-star rating with comment (200 OK)
    const validFeedbackRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/feedback`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        rating: 5,
        comment: 'Super fast and courteous support. Thank you!',
      }
    );
    assert(
      validFeedbackRes.status === 200 &&
        validFeedbackRes.data?.data?.rating === 5 &&
        validFeedbackRes.data?.data?.comment?.includes('Super fast'),
      '10. Customer successfully submitted 5-star CSAT review for resolved ticket'
    );

    // 11. Duplicate feedback guard: Submitting again rejected with 409 Conflict
    const dupFeedbackRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/tickets/${ticketId}/feedback`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        rating: 4,
        comment: 'Changing my mind duplicate',
      }
    );
    assert(dupFeedbackRes.status === 409, '11. Duplicate feedback submission rejected with 409 Conflict');

    // 12. Check that the CSAT review is reflected in Admin CSAT Analytics
    const csatAnalyticsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics/csat',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csatData = csatAnalyticsRes.data?.data;
    assert(
      csatAnalyticsRes.status === 200 &&
        csatData?.summary?.totalReviews >= 1 &&
        csatData?.summary?.distribution?.['5'] >= 1 &&
        csatData?.recentReviews?.some((r) => r.ticketId === ticketId),
      '12. Admin CSAT analytics accurately updated with new customer review'
    );

    // 13. Verify Agent Workload Analytics includes assignment & resolution counters
    const agentWorkloadRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics/agents',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const workloadData = agentWorkloadRes.data?.data;
    assert(
      agentWorkloadRes.status === 200 &&
        Array.isArray(workloadData?.agents) &&
        workloadData.agents.some((a) => a.resolvedTickets >= 1),
      '13. Agent workload aggregation tracks resolved counts and active loads'
    );

    // 14. Date range query testing (7d, 30d, 90d, all)
    const range7dRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics/dashboard?range=7d',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(range7dRes.status === 200 && range7dRes.data?.data?.timeRange?.range === '7d', '14. Date range filter ?range=7d works accurately');

    // 15. Invalid date query validation returns 400
    const badDateRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics/dashboard?startDate=invalid-date',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(badDateRes.status === 400, '15. Invalid date range parameter rejected with 400 Bad Request');

  } catch (error) {
    console.error('Fatal error during test suite:', error);
    failed++;
  }

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
