const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  getTicketStats,
  updateTicketStatus,
  assignTicket,
  updateTicket,
  deleteTicket,
  submitTicketFeedback,
  getTicketFeedback,
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');
const { validateCreateTicket } = require('../validators/ticketValidator');

// Protected Routes for all authenticated roles (customer, agent, admin)
router.post('/', protect, validateCreateTicket, createTicket);
router.get('/', protect, getTickets);
router.get('/stats', protect, getTicketStats);
router.get('/:id', protect, getTicketById);
router.put('/:id', protect, updateTicket);
router.patch('/:id/status', protect, updateTicketStatus);
router.patch('/:id/assign', protect, assignTicket);

// CSAT Feedback routes
router.post('/:id/feedback', protect, submitTicketFeedback);
router.get('/:id/feedback', protect, getTicketFeedback);

// Nested conversation messages & internal notes routes
const messageRoutes = require('./messageRoutes');
router.use('/:id/messages', messageRoutes);

// Nested AI Ticket Intelligence routes
const aiRoutes = require('./aiRoutes');
router.use('/:id/ai', aiRoutes);

// Admin-only ticket deletion
router.delete('/:id', protect, authorize('admin'), deleteTicket);

module.exports = router;
