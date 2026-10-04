const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');
const notificationService = require('../services/notificationService');

/**
 * Get all messages for a ticket
 * GET /api/tickets/:ticketId/messages
 * Access: Owner Customer, Authorized Agent, Admin
 */
const getTicketMessages = async (req, res, next) => {
  try {
    const rawId = req.params.ticketId || req.params.id;

    const query = mongoose.Types.ObjectId.isValid(rawId)
      ? { $or: [{ _id: rawId }, { ticketId: rawId.toUpperCase() }] }
      : { ticketId: rawId.toUpperCase() };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Authorization Guard
    if (req.user.role === 'customer') {
      if (ticket.customer.toString() !== req.user._id.toString()) {
        return ApiResponse.error(
          res,
          'Forbidden: You are not authorized to view messages on this ticket.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    // Backend Security Filter: Customers can NEVER retrieve internal notes
    const messageFilter = { ticket: ticket._id };
    if (req.user.role === 'customer') {
      messageFilter.isInternal = false;
    }

    const messages = await Message.find(messageFilter)
      .populate('sender', 'name email role department avatar')
      .sort({ createdAt: 1 })
      .lean();

    return ApiResponse.success(
      res,
      messages,
      `Retrieved ${messages.length} messages for ticket ${ticket.ticketId}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Add a message or private internal note to a ticket
 * POST /api/tickets/:ticketId/messages
 * Access: Owner Customer (public only), Agent, Admin
 */
const addTicketMessage = async (req, res, next) => {
  try {
    const rawId = req.params.ticketId || req.params.id;
    const { message, isInternal = false, attachments = [] } = req.body;

    const query = mongoose.Types.ObjectId.isValid(rawId)
      ? { $or: [{ _id: rawId }, { ticketId: rawId.toUpperCase() }] }
      : { ticketId: rawId.toUpperCase() };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Authorization Guard
    if (req.user.role === 'customer') {
      if (ticket.customer.toString() !== req.user._id.toString()) {
        return ApiResponse.error(
          res,
          'Forbidden: You can only post messages to your own tickets.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    // Strict Internal Note Guard
    const finalIsInternal = Boolean(isInternal) && ['agent', 'admin'].includes(req.user.role);

    // Create Message
    const createdMessage = await Message.create({
      ticket: ticket._id,
      sender: req.user._id,
      senderRole: req.user.role,
      message: message.trim(),
      isInternal: finalIsInternal,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    await createdMessage.populate('sender', 'name email role department avatar');

    // Audit Logging
    await recordAuditLog({
      actor: req.user,
      action: finalIsInternal ? 'INTERNAL_NOTE_ADDED' : 'MESSAGE_POSTED',
      entityId: ticket.ticketId,
      details: {
        messageId: createdMessage._id,
        isInternal: finalIsInternal,
        preview: message.substring(0, 80),
      },
      req,
    });

    // If customer replied while ticket was WAITING_FOR_CUSTOMER, update status back to IN_PROGRESS
    if (req.user.role === 'customer' && ticket.status === 'WAITING_FOR_CUSTOMER') {
      ticket.status = 'IN_PROGRESS';
      await ticket.save();
    }

    // If staff replied publicly, record firstResponseAt timestamp for accurate SLA tracking
    if (!finalIsInternal && ['agent', 'admin'].includes(req.user.role) && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
      await ticket.save();
    }

    // Dispatch in-app & email notifications
    const previewContent = message.length > 120 ? `${message.substring(0, 117)}...` : message;

    if (finalIsInternal) {
      // INTERNAL NOTE: Customer is NEVER notified!
      // If there is an assigned agent different from current sender, notify them
      if (ticket.assignedAgent && ticket.assignedAgent.toString() !== req.user._id.toString()) {
        await notificationService.notify({
          recipientId: ticket.assignedAgent,
          senderId: req.user._id,
          ticketIdRef: ticket._id,
          ticketId: ticket.ticketId,
          type: 'NEW_MESSAGE',
          title: `Internal Note added on ${ticket.ticketId}`,
          content: `${req.user.name} added an internal note: "${previewContent}"`,
          sendEmailAlert: false, // Internal notes remain in-app
        });
      }
    } else {
      // PUBLIC MESSAGE
      if (req.user.role === 'customer') {
        // Customer replied: Notify assigned agent (if exists)
        if (ticket.assignedAgent) {
          await notificationService.notify({
            recipientId: ticket.assignedAgent,
            senderId: req.user._id,
            ticketIdRef: ticket._id,
            ticketId: ticket.ticketId,
            type: 'NEW_MESSAGE',
            title: `Customer reply on ${ticket.ticketId}`,
            content: `${req.user.name} replied: "${previewContent}"`,
            sendEmailAlert: true,
          });
        }
      } else {
        // Agent or Admin replied: Notify the customer!
        await notificationService.notify({
          recipientId: ticket.customer,
          senderId: req.user._id,
          ticketIdRef: ticket._id,
          ticketId: ticket.ticketId,
          type: 'NEW_MESSAGE',
          title: `New response on your ticket ${ticket.ticketId}`,
          content: `${req.user.name} from Support replied: "${previewContent}"`,
          sendEmailAlert: true,
        });
      }
    }

    logger.info(`Message posted on ${ticket.ticketId} by ${req.user.email} (internal: ${finalIsInternal})`);

    return ApiResponse.success(res, createdMessage, 'Message added successfully', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTicketMessages,
  addTicketMessage,
};
