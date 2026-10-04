const express = require('express');
const router = express.Router();
const { getAgents } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Agent directory & workload overview: Accessible by Agents and Admins
router.get('/', protect, authorize('agent', 'admin'), getAgents);

module.exports = router;
