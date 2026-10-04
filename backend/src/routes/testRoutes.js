const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');

// Public endpoint
router.get('/public', (req, res) => {
  return ApiResponse.success(res, { message: 'Public endpoint accessible to everyone' });
});

// Protected endpoint (any authenticated user)
router.get('/protected', protect, (req, res) => {
  return ApiResponse.success(res, {
    message: `Authenticated access granted for user ${req.user.email}`,
    role: req.user.role,
    user: req.user.name,
  });
});

// Agent & Admin endpoint
router.get('/agent-only', protect, authorize('agent', 'admin'), (req, res) => {
  return ApiResponse.success(res, {
    message: `Agent/Admin workspace access granted for ${req.user.email}`,
    role: req.user.role,
  });
});

// Admin-only endpoint
router.get('/admin-only', protect, authorize('admin'), (req, res) => {
  return ApiResponse.success(res, {
    message: `Admin root command access granted for ${req.user.email}`,
    role: req.user.role,
  });
});

module.exports = router;
