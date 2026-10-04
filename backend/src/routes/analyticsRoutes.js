const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');
const { validateAnalyticsQuery } = require('../validators/analyticsValidator');

// Admin-Only Analytics Routes
router.use(protect, authorize('admin'));

router.get('/dashboard', validateAnalyticsQuery, analyticsController.getDashboardAnalytics);
router.get('/agents', validateAnalyticsQuery, analyticsController.getAgentWorkloadAnalytics);
router.get('/csat', validateAnalyticsQuery, analyticsController.getCsatAnalytics);

module.exports = router;
