const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  analyzeTicketHandler,
  applyAnalysisHandler,
  suggestReplyHandler,
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

// Protected AI Endpoints
router.post('/analyze', protect, analyzeTicketHandler);
router.post('/apply', protect, applyAnalysisHandler);
router.post('/suggest-reply', protect, authorize('agent', 'admin'), suggestReplyHandler);

module.exports = router;
