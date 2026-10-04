const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');
const { validateStatusTransition } = require('../validators/ticketValidator');
const notificationService = require('../services/notificationService');
const { escapeRegex } = require('../utils/sanitize');

/**
 * Create a new support ticket
 * POST /api/tickets
 * Access: Customer, Admin
 */
const createTicket = async (req, res, next) => {
  try {
    const { title, description, category, priority } = req.body;

    // Customer ID is strictly enforced from authenticated session token
    let customerId = req.user._id;
    if (req.user.role === 'admin' && req.body.customerId) {
      customerId = req.body.customerId;
    }

    const ticket = await Ticket.create({
      title,
      description,
      customer: customerId,
      category: category || 'general',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
    });

    await ticket.populate('customer', 'name email avatar department');

    await recordAuditLog({
      actor: req.user,
      action: 'TICKET_CREATED',
      entityId: ticket.ticketId,
      details: {
        title: ticket.title,
        priority: ticket.priority,
        category: ticket.category,
      },
      req,
    });

    logger.info(`Ticket created: ${ticket.ticketId} by ${req.user.email}`);

    return ApiResponse.success(res, ticket, 'Support ticket created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * List tickets with role-based filtering, search and pagination
 * GET /api/tickets
 * Access: Customer (own tickets), Agent (assigned/queue), Admin (all)
 */
const getTickets = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const { status, priority, category, search, queue } = req.query;
    const filter = {};

    // 1. Role-based scoping
    if (req.user.role === 'customer') {
      // Customer is strictly scoped to their own tickets
      filter.customer = req.user._id;
    } else if (req.user.role === 'agent') {
      if (queue === 'unassigned') {
        filter.assignedAgent = null;
        filter.status = 'OPEN';
      } else if (queue === 'all') {
        // Agent viewing full workspace
      } else {
        // Default agent view: Tickets assigned to this agent
        filter.assignedAgent = req.user._id;
      }
    }

    // 2. Query filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    // 3. Search query across ticketId, title, or description (with ReDoS escaping)
    if (search && search.trim()) {
      const cleanSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(cleanSearch, 'i');
      filter.$or = [
        { ticketId: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
      ];
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('customer', 'name email avatar department')
        .populate('assignedAgent', 'name email department avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    return ApiResponse.paginated(
      res,
      tickets,
      page,
      limit,
      total,
      'Tickets retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket details by ID or ticketId
 * GET /api/tickets/:id
 * Access: Owner Customer, Agent, Admin
 */
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { ticketId: id.toUpperCase() }] }
      : { ticketId: id.toUpperCase() };

    const ticket = await Ticket.findOne(query)
      .populate('customer', 'name email avatar department')
      .populate('assignedAgent', 'name email department avatar assignedTicketsCount');

    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Authorization check: Customer can only view their own ticket
    if (
      req.user.role === 'customer' &&
      ticket.customer._id.toString() !== req.user._id.toString()
    ) {
      return ApiResponse.error(
        res,
        'Forbidden: You are not authorized to view this ticket.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    // Retrieve activity history from AuditLog (Customers never receive internal note logs)
    const auditFilter = { entityId: ticket.ticketId };
    if (req.user.role === 'customer') {
      auditFilter.action = { $ne: 'INTERNAL_NOTE_ADDED' };
      auditFilter['details.isInternal'] = { $ne: true };
    }

    const auditHistory = await AuditLog.find(auditFilter)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return ApiResponse.success(
      res,
      {
        ticket,
        auditHistory,
      },
      'Ticket details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket status according to State Machine rules
 * PATCH /api/tickets/:id/status
 * Access: Customer (close/reopen), Agent, Admin
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { ticketId: id.toUpperCase() }] }
      : { ticketId: id.toUpperCase() };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Customer permission check
    if (req.user.role === 'customer') {
      if (ticket.customer.toString() !== req.user._id.toString()) {
        return ApiResponse.error(res, 'Forbidden: Not your ticket.', 403, null, 'FORBIDDEN');
      }
    }

    // Agent permission check
    if (req.user.role === 'agent') {
      const isAssigned = ticket.assignedAgent && ticket.assignedAgent.toString() === req.user._id.toString();
      if (!isAssigned) {
        return ApiResponse.error(
          res,
          'Forbidden: You can only update the status of tickets assigned to you.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    // State machine transition validation
    const transitionCheck = validateStatusTransition(ticket.status, newStatus, req.user.role);
    if (!transitionCheck.valid) {
      return ApiResponse.error(res, transitionCheck.message, 400, null, 'INVALID_TRANSITION');
    }

    const oldStatus = ticket.status;
    ticket.status = newStatus;
    await ticket.save();

    await recordAuditLog({
      actor: req.user,
      action: 'TICKET_STATUS_CHANGED',
      entityId: ticket.ticketId,
      details: {
        fromStatus: oldStatus,
        toStatus: newStatus,
      },
      req,
    });

    await ticket.populate('customer', 'name email avatar department');
    await ticket.populate('assignedAgent', 'name email department avatar');

    logger.info(`Ticket ${ticket.ticketId} status changed: ${oldStatus} -> ${newStatus} by ${req.user.email}`);

    // Dispatch status change notifications
    const targetStatus = newStatus.replace(/_/g, ' ');
    if (ticket.customer && ticket.customer._id.toString() !== req.user._id.toString()) {
      await notificationService.notify({
        recipientId: ticket.customer._id,
        senderId: req.user._id,
        ticketIdRef: ticket._id,
        ticketId: ticket.ticketId,
        type: 'STATUS_CHANGED',
        title: `Ticket ${ticket.ticketId} is now ${targetStatus}`,
        content: `Your support ticket "${ticket.title}" status has been updated to ${targetStatus}.`,
        sendEmailAlert: true,
      });
    }

    if (ticket.assignedAgent && ticket.assignedAgent._id.toString() !== req.user._id.toString()) {
      await notificationService.notify({
        recipientId: ticket.assignedAgent._id,
        senderId: req.user._id,
        ticketIdRef: ticket._id,
        ticketId: ticket.ticketId,
        type: 'STATUS_CHANGED',
        title: `Assigned ticket ${ticket.ticketId} is now ${targetStatus}`,
        content: `Ticket "${ticket.title}" was moved to ${targetStatus} by ${req.user.name}.`,
        sendEmailAlert: false,
      });
    }

    return ApiResponse.success(res, ticket, `Ticket status updated to ${newStatus}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Assign or reassign ticket to an agent
 * PATCH /api/tickets/:id/assign
 * Access: Admin (any agent), Agent (claim for self)
 */
const assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { agentId } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { ticketId: id.toUpperCase() }] }
      : { ticketId: id.toUpperCase() };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Role check: Customer cannot assign
    if (req.user.role === 'customer') {
      return ApiResponse.error(res, 'Forbidden: Customers cannot assign tickets.', 403, null, 'FORBIDDEN');
    }

    // If agentId is not specified or user is agent, default to self-claiming
    if (req.user.role === 'agent') {
      // Security Policy: Agents can only claim unassigned tickets or tickets already assigned to them
      if (ticket.assignedAgent && ticket.assignedAgent.toString() !== req.user._id.toString()) {
        return ApiResponse.error(
          res,
          'Forbidden: Only administrators can reassign tickets between agents.',
          403,
          null,
          'FORBIDDEN'
        );
      }
      agentId = req.user._id;
    } else if (!agentId) {
      agentId = req.user._id;
    }

    let newAgent = null;
    if (agentId) {
      newAgent = await User.findById(agentId);
      if (!newAgent || !['agent', 'admin'].includes(newAgent.role) || !newAgent.isActive) {
        return ApiResponse.error(
          res,
          'Invalid assignee: User does not exist, is not an agent/admin, or is deactivated.',
          400,
          null,
          'INVALID_AGENT'
        );
      }
    }

    const previousAgentId = ticket.assignedAgent ? ticket.assignedAgent.toString() : null;
    const newAgentId = newAgent ? newAgent._id.toString() : null;

    if (previousAgentId === newAgentId) {
      await ticket.populate('customer', 'name email avatar department');
      await ticket.populate('assignedAgent', 'name email department avatar assignedTicketsCount');
      return ApiResponse.success(res, ticket, 'Ticket is already assigned to this staff member.');
    }

    // Update workload counters
    if (previousAgentId) {
      await User.findByIdAndUpdate(previousAgentId, { $inc: { assignedTicketsCount: -1 } });
    }
    if (newAgentId) {
      await User.findByIdAndUpdate(newAgentId, { $inc: { assignedTicketsCount: 1 } });
    }

    ticket.assignedAgent = newAgentId;
    if (ticket.status === 'OPEN' && newAgentId) {
      ticket.status = 'ASSIGNED';
    } else if (!newAgentId && ticket.status === 'ASSIGNED') {
      ticket.status = 'OPEN';
    }

    await ticket.save();

    await recordAuditLog({
      actor: req.user,
      action: 'TICKET_ASSIGNED',
      entityId: ticket.ticketId,
      details: {
        assignedToEmail: newAgent ? newAgent.email : 'Unassigned',
        assignedToName: newAgent ? newAgent.name : 'Unassigned',
      },
      req,
    });

    await ticket.populate('customer', 'name email avatar department');
    await ticket.populate('assignedAgent', 'name email department avatar assignedTicketsCount');

    logger.info(`Ticket ${ticket.ticketId} assigned to ${newAgent ? newAgent.email : 'None'} by ${req.user.email}`);

    // Dispatch assignment notifications
    if (newAgent) {
      if (newAgent._id.toString() !== req.user._id.toString()) {
        await notificationService.notify({
          recipientId: newAgent._id,
          senderId: req.user._id,
          ticketIdRef: ticket._id,
          ticketId: ticket.ticketId,
          type: 'TICKET_ASSIGNED',
          title: `Ticket ${ticket.ticketId} assigned to you`,
          content: `You have been assigned to support ticket "${ticket.title}".`,
          sendEmailAlert: true,
        });
      }

      if (ticket.customer && ticket.customer._id.toString() !== req.user._id.toString()) {
        await notificationService.notify({
          recipientId: ticket.customer._id,
          senderId: req.user._id,
          ticketIdRef: ticket._id,
          ticketId: ticket.ticketId,
          type: 'TICKET_ASSIGNED',
          title: `Agent assigned to ticket ${ticket.ticketId}`,
          content: `${newAgent.name} from Support Operations has been assigned to your ticket.`,
          sendEmailAlert: true,
        });
      }
    }

    return ApiResponse.success(
      res,
      ticket,
      newAgent ? `Ticket assigned to ${newAgent.name}` : 'Ticket unassigned'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket content (title, description, priority, category)
 * PUT /api/tickets/:id
 * Access: Customer (if OPEN), Admin
 */
const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { ticketId: id.toUpperCase() }] }
      : { ticketId: id.toUpperCase() };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Customer can only update if still OPEN
    if (req.user.role === 'customer') {
      if (ticket.customer.toString() !== req.user._id.toString()) {
        return ApiResponse.error(res, 'Forbidden: Not your ticket.', 403, null, 'FORBIDDEN');
      }
      if (ticket.status !== 'OPEN') {
        return ApiResponse.error(
          res,
          'Ticket cannot be edited after work has begun. Please send a message instead.',
          400,
          null,
          'TICKET_LOCKED'
        );
      }
    }

    // Agent permission check: Only assigned agent can edit ticket content
    if (req.user.role === 'agent') {
      const isAssigned = ticket.assignedAgent && ticket.assignedAgent.toString() === req.user._id.toString();
      if (!isAssigned) {
        return ApiResponse.error(
          res,
          'Forbidden: You can only edit tickets assigned to you.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    if (title) ticket.title = title.trim();
    if (description) ticket.description = description.trim();
    if (category) ticket.category = category;
    if (priority) ticket.priority = priority;

    await ticket.save();

    await recordAuditLog({
      actor: req.user,
      action: 'TICKET_UPDATED',
      entityId: ticket.ticketId,
      details: { title: ticket.title, priority: ticket.priority },
      req,
    });

    await ticket.populate('customer', 'name email avatar department');
    await ticket.populate('assignedAgent', 'name email department avatar');

    return ApiResponse.success(res, ticket, 'Ticket updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete ticket
 * DELETE /api/tickets/:id
 * Access: Admin only
 */
const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { ticketId: id.toUpperCase() }] }
      : { ticketId: id.toUpperCase() };

    const ticket = await Ticket.findOneAndDelete(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    if (ticket.assignedAgent) {
      await User.findByIdAndUpdate(ticket.assignedAgent, { $inc: { assignedTicketsCount: -1 } });
    }

    await recordAuditLog({
      actor: req.user,
      action: 'TICKET_DELETED',
      entityId: ticket.ticketId,
      details: { title: ticket.title },
      req,
    });

    logger.info(`Ticket ${ticket.ticketId} deleted by Admin ${req.user.email}`);

    return ApiResponse.success(res, { ticketId: ticket.ticketId }, 'Ticket deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket statistics scoped by user role
 * GET /api/tickets/stats
 */
const getTicketStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    let stats = {};

    if (role === 'customer') {
      const [total, open, inProgress, waiting, resolved, closed] = await Promise.all([
        Ticket.countDocuments({ customer: req.user._id }),
        Ticket.countDocuments({ customer: req.user._id, status: 'OPEN' }),
        Ticket.countDocuments({ customer: req.user._id, status: 'IN_PROGRESS' }),
        Ticket.countDocuments({ customer: req.user._id, status: 'WAITING_FOR_CUSTOMER' }),
        Ticket.countDocuments({ customer: req.user._id, status: 'RESOLVED' }),
        Ticket.countDocuments({ customer: req.user._id, status: 'CLOSED' }),
      ]);
      stats = { total, open, inProgress, waiting, resolved, closed };
    } else if (role === 'agent') {
      const [myAssigned, myInProgress, myWaiting, myResolved, unassignedQueue, totalGlobal] = await Promise.all([
        Ticket.countDocuments({ assignedAgent: req.user._id }),
        Ticket.countDocuments({ assignedAgent: req.user._id, status: 'IN_PROGRESS' }),
        Ticket.countDocuments({ assignedAgent: req.user._id, status: 'WAITING_FOR_CUSTOMER' }),
        Ticket.countDocuments({ assignedAgent: req.user._id, status: 'RESOLVED' }),
        Ticket.countDocuments({ assignedAgent: null, status: 'OPEN' }),
        Ticket.countDocuments({}),
      ]);
      stats = { myAssigned, myInProgress, myWaiting, myResolved, unassignedQueue, totalGlobal };
    } else {
      // Admin
      const [total, open, assigned, inProgress, waiting, resolved, closed, unassignedCount] = await Promise.all([
        Ticket.countDocuments({}),
        Ticket.countDocuments({ status: 'OPEN' }),
        Ticket.countDocuments({ status: 'ASSIGNED' }),
        Ticket.countDocuments({ status: 'IN_PROGRESS' }),
        Ticket.countDocuments({ status: 'WAITING_FOR_CUSTOMER' }),
        Ticket.countDocuments({ status: 'RESOLVED' }),
        Ticket.countDocuments({ status: 'CLOSED' }),
        Ticket.countDocuments({ assignedAgent: null, status: 'OPEN' }),
      ]);
      stats = { total, open, assigned, inProgress, waiting, resolved, closed, unassignedCount };
    }

    return ApiResponse.success(res, stats, 'Ticket statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Submit CSAT Feedback for a resolved or closed ticket
 * POST /api/tickets/:id/feedback
 */
const submitTicketFeedback = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const { rating, comment = '' } = req.body;

    const query = mongoose.Types.ObjectId.isValid(rawId)
      ? { $or: [{ _id: rawId }, { ticketId: rawId.toUpperCase() }] }
      : { ticketId: rawId.toUpperCase() };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // 1. Authorization: Only the customer who owns the ticket (or admin) can submit feedback
    const customerId = (ticket.customer?._id || ticket.customer)?.toString();
    const userId = (req.user?._id || req.user?.id)?.toString();

    if (req.user.role === 'customer' && customerId !== userId) {
      return ApiResponse.error(
        res,
        'Forbidden: You can only submit feedback for your own tickets.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    // 2. Eligibility: Ticket MUST be in RESOLVED or CLOSED status
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return ApiResponse.error(
        res,
        'Feedback can only be submitted for resolved or closed tickets.',
        400,
        null,
        'TICKET_NOT_ELIGIBLE_FOR_FEEDBACK'
      );
    }

    // 3. Duplicate Prevention: Reject if feedback already exists and update is not explicitly requested
    if (ticket.feedback && ticket.feedback.rating && !req.body.allowUpdate && !req.query.update) {
      return ApiResponse.error(
        res,
        'Feedback has already been submitted for this ticket.',
        409,
        ticket.feedback,
        'DUPLICATE_FEEDBACK'
      );
    }

    // 4. Rating Validation: 1 to 5 integer
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return ApiResponse.error(
        res,
        'Rating must be an integer between 1 and 5.',
        400,
        null,
        'INVALID_RATING'
      );
    }

    // 5. Sanitize comment
    const sanitizedComment = String(comment || '').trim().substring(0, 1000);

    ticket.feedback = {
      rating: parsedRating,
      comment: sanitizedComment,
      submittedAt: new Date(),
    };

    await ticket.save();

    // 6. Record Audit Log
    await recordAuditLog({
      actor: req.user,
      action: 'CSAT_FEEDBACK_SUBMITTED',
      entityId: ticket.ticketId,
      details: {
        rating: parsedRating,
        commentPreview: sanitizedComment.substring(0, 60),
      },
      req,
    });

    // 7. Notify assigned agent if present
    if (ticket.assignedAgent) {
      await notificationService.notify({
        recipientId: ticket.assignedAgent,
        senderId: req.user._id,
        type: 'TICKET_FEEDBACK_RECEIVED',
        ticketId: ticket.ticketId,
        title: `Customer Rated Ticket ${ticket.ticketId}`,
        content: `Customer rated ticket ${ticket.ticketId}: ${parsedRating} / 5 stars. ${sanitizedComment ? `"${sanitizedComment.substring(0, 80)}"` : ''}`,
      });
    }

    return ApiResponse.success(res, ticket.feedback, 'Customer satisfaction feedback submitted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get CSAT feedback for a ticket
 * GET /api/tickets/:id/feedback
 */
const getTicketFeedback = async (req, res, next) => {
  try {
    const rawId = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(rawId)
      ? { $or: [{ _id: rawId }, { ticketId: rawId.toUpperCase() }] }
      : { ticketId: rawId.toUpperCase() };

    const ticket = await Ticket.findOne(query).select('ticketId customer assignedAgent feedback status');
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    const customerId = (ticket.customer?._id || ticket.customer)?.toString();
    const userId = (req.user?._id || req.user?.id)?.toString();

    // Access check: Customer can only view their own ticket feedback; staff can view all
    if (req.user.role === 'customer' && customerId !== userId) {
      return ApiResponse.error(res, 'Forbidden: Not authorized to view feedback for this ticket.', 403, null, 'FORBIDDEN');
    }

    return ApiResponse.success(res, ticket.feedback || null, 'Ticket feedback retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
