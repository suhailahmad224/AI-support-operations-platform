const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  seedDemoUsers,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
} = require('../validators/authValidator');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/seed', seedDemoUsers);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
