const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getTicketMessages,
  addTicketMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validateAddMessage } = require('../validators/messageValidator');

// Protected conversation routes
router.get('/', protect, getTicketMessages);
router.post('/', protect, validateAddMessage, addTicketMessage);

module.exports = router;
