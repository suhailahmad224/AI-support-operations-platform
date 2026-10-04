const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const ApiResponse = require('../utils/apiResponse');
const { recordAuditLog } = require('../utils/auditLogger');
const aiService = require('../services/ai/aiService');
const logger = require('../utils/logger');

/**
 * Generate AI analysis for a support ticket
 * POST /api/tickets/:id/ai/analyze
 * Access: Owner Customer, Agent, Admin
 */
const analyzeTicketHandler = async (req, res, next) => {
  try {
    const rawId = req.params.ticketId || req.params.id;

    const query = mongoose.Types.ObjectId.isValid(rawId)
      ? { $or: [{ _id: rawId }, { ticketId: rawId.toUpperCase() }] }
      : { ticketId: rawId.toUpperCase() };

    const ticket = await Ticket.findOne(query).populate('customer', 'name email department');
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Authorization check
    if (req.user.role === 'customer') {
      const ticketCustomerId = (ticket.customer?._id || ticket.customer)?.toString();
      const currentUserId = (req.user?._id || req.user?.id)?.toString();
      if (!ticketCustomerId || ticketCustomerId !== currentUserId) {
        return ApiResponse.error(
          res,
          'Forbidden: You are not authorized to analyze tickets belonging to other users.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    const analysis = await aiService.analyzeTicket({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
    });

    return ApiResponse.success(
      res,
      analysis,
      'Ticket AI analysis generated successfully (Mock Provider)'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Review and apply AI suggestions to the ticket
 * POST /api/tickets/:id/ai/apply
 * Access: Agent, Admin (for category/priority/sentiment), Owner Customer (metadata only)
 */
const applyAnalysisHandler = async (req, res, next) => {
  try {
    const rawId = req.params.ticketId || req.params.id;
    const { 
      suggestedCategory, 
      suggestedPriority, 
      sentiment, 
      intent, 
      summary, 
      tags,
      applyCategory = true,
      applyPriority = true,
    } = req.body;

    const query = mongoose.Types.ObjectId.isValid(rawId)
      ? { $or: [{ _id: rawId }, { ticketId: rawId.toUpperCase() }] }
      : { ticketId: rawId.toUpperCase() };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Authorization check
    if (req.user.role === 'customer') {
      const ticketCustomerId = (ticket.customer?._id || ticket.customer)?.toString();
      const currentUserId = (req.user?._id || req.user?.id)?.toString();
      if (!ticketCustomerId || ticketCustomerId !== currentUserId) {
        return ApiResponse.error(
          res,
          'Forbidden: Not authorized to modify this ticket.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    // Agent permission check: Agents can apply analysis to unassigned tickets or tickets assigned to them
    if (req.user.role === 'agent') {
      const isAuthorizedAgent = !ticket.assignedAgent || ticket.assignedAgent.toString() === req.user._id.toString();
      if (!isAuthorizedAgent) {
        return ApiResponse.error(
          res,
          'Forbidden: You can only apply AI suggestions to unassigned tickets or tickets assigned to you.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    // Security Guard: Customers cannot re-categorize or elevate ticket priority post-creation
    const canChangeTriage = ['agent', 'admin'].includes(req.user.role);

    const oldCategory = ticket.category;
    const oldPriority = ticket.priority;

    // Apply allowed fields safely
    if (sentiment) ticket.sentiment = sentiment;
    if (intent) ticket.intent = intent;
    if (summary) ticket.aiSummary = summary;
    if (Array.isArray(tags) && tags.length > 0) {
      ticket.tags = [...new Set([...ticket.tags, ...tags])];
    }

    if (canChangeTriage) {
      if (applyCategory && suggestedCategory) {
        const validCategories = ['billing', 'technical', 'account', 'feature_request', 'general'];
        if (validCategories.includes(suggestedCategory)) {
          ticket.category = suggestedCategory;
        }
      }
      if (applyPriority && suggestedPriority) {
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        if (validPriorities.includes(suggestedPriority)) {
          ticket.priority = suggestedPriority;
        }
      }
    }

    // Explicit security boundary: NEVER allow AI output to mutate ownership or status
    // ticket.customer, ticket.assignedAgent, ticket.status remain strictly untouched

    await ticket.save();

    await recordAuditLog({
      actor: req.user,
      action: 'AI_ANALYSIS_APPLIED',
      entityId: ticket.ticketId,
      details: {
        categoryChange: oldCategory !== ticket.category ? `${oldCategory} -> ${ticket.category}` : 'unchanged',
        priorityChange: oldPriority !== ticket.priority ? `${oldPriority} -> ${ticket.priority}` : 'unchanged',
        sentiment: ticket.sentiment,
        intent: ticket.intent,
      },
      req,
    });

    await ticket.populate('customer', 'name email avatar department');
    await ticket.populate('assignedAgent', 'name email department avatar');

    logger.info(`AI analysis applied to ${ticket.ticketId} by ${req.user.email}`);

    return ApiResponse.success(res, ticket, 'AI suggestions applied to ticket successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate contextual reply suggestion for support staff
 * POST /api/tickets/:id/ai/suggest-reply
 * Access: Agent, Admin (Restricted from Customer)
 */
const suggestReplyHandler = async (req, res, next) => {
  try {
    const rawId = req.params.ticketId || req.params.id;

    // Security Guard: Customers cannot request staff reply suggestions
    if (req.user.role === 'customer') {
      return ApiResponse.error(
        res,
        'Forbidden: AI reply suggestions are restricted to support agents and administrators.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    const query = mongoose.Types.ObjectId.isValid(rawId)
      ? { $or: [{ _id: rawId }, { ticketId: rawId.toUpperCase() }] }
      : { ticketId: rawId.toUpperCase() };

    const ticket = await Ticket.findOne(query).populate('customer', 'name email department');
    if (!ticket) {
      return ApiResponse.error(res, 'Ticket not found', 404, null, 'TICKET_NOT_FOUND');
    }

    // Agent permission check: Agents can only generate replies for unassigned tickets or tickets assigned to them
    if (req.user.role === 'agent') {
      const isAuthorizedAgent = !ticket.assignedAgent || ticket.assignedAgent.toString() === req.user._id.toString();
      if (!isAuthorizedAgent) {
        return ApiResponse.error(
          res,
          'Forbidden: You can only generate AI replies for unassigned tickets or tickets assigned to you.',
          403,
          null,
          'FORBIDDEN'
        );
      }
    }

    // Security Privacy Filter: Internal notes are strictly excluded so AI never references confidential notes
    const messages = await Message.find({ ticket: ticket._id, isInternal: false })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    const replyResult = await aiService.generateSuggestedReply({
      ticket,
      messages,
      requester: ticket.customer,
    });

    // Cache the suggested reply on ticket document
    ticket.aiSuggestedResponse = replyResult.suggestedReply;
    await ticket.save();

    logger.info(`AI reply generated for ${ticket.ticketId} by ${req.user.email}`);

    return ApiResponse.success(
      res,
      replyResult,
      'Contextual AI reply generated successfully (Mock Provider)'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeTicketHandler,
  applyAnalysisHandler,
  suggestReplyHandler,
};
