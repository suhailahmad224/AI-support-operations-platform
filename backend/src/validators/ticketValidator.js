const ApiResponse = require('../utils/apiResponse');

const validCategories = ['billing', 'technical', 'account', 'feature_request', 'general'];
const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];

// Strict Ticket State Machine Transitions
const ALLOWED_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'OPEN', 'CLOSED'],
  IN_PROGRESS: ['WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

const validateCreateTicket = (req, res, next) => {
  const { title, description, category, priority } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters long');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push('Description is required and must be at least 10 characters long');
  }

  if (category && !validCategories.includes(category)) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  if (priority && !validPriorities.includes(priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
  }

  // Security: Strictly delete any fields that client might attempt to inject
  delete req.body.ticketId;
  delete req.body.status;
  delete req.body.assignedAgent;
  delete req.body.customer;
  delete req.body.resolvedAt;
  delete req.body.closedAt;
  delete req.body.feedback;
  delete req.body.firstResponseAt;
  delete req.body.sentiment;
  delete req.body.intent;
  delete req.body.aiSummary;
  delete req.body.aiSuggestedResponse;

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  req.body.title = title.trim();
  req.body.description = description.trim();
  next();
};

const validateStatusTransition = (fromStatus, toStatus, userRole) => {
  if (!validStatuses.includes(toStatus)) {
    return { valid: false, message: `Status '${toStatus}' is not a recognized ticket status.` };
  }

  if (fromStatus === toStatus) {
    return { valid: false, message: `Ticket is already in status '${toStatus}'.` };
  }

  const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!allowedNext.includes(toStatus)) {
    return {
      valid: false,
      message: `Invalid status transition: Cannot move from '${fromStatus}' to '${toStatus}'. Allowed next: [${allowedNext.join(', ')}]`,
    };
  }

  // Role permissions on status changes
  if (userRole === 'customer') {
    if (!['CLOSED', 'OPEN'].includes(toStatus)) {
      return {
        valid: false,
        message: `Customers are only permitted to close their tickets or reopen resolved tickets.`,
      };
    }
  }

  return { valid: true };
};

module.exports = {
  validCategories,
  validPriorities,
  validStatuses,
  ALLOWED_TRANSITIONS,
  validateCreateTicket,
  validateStatusTransition,
};
