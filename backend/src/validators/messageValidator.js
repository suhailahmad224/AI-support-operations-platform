const ApiResponse = require('../utils/apiResponse');

/**
 * Validate message input payload
 */
const validateAddMessage = (req, res, next) => {
  const { message, isInternal } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return ApiResponse.error(res, 'Message text is required and cannot be empty.', 400);
  }

  if (message.trim().length > 5000) {
    return ApiResponse.error(res, 'Message cannot exceed 5000 characters.', 400);
  }

  // Security Guard: Customers are strictly forbidden from creating internal notes
  if (isInternal === true && req.user.role === 'customer') {
    return ApiResponse.error(
      res,
      'Forbidden: Customers are not permitted to create private internal notes.',
      403,
      null,
      'FORBIDDEN'
    );
  }

  // Attachment validation & path traversal defense
  if (req.body.attachments !== undefined) {
    if (!Array.isArray(req.body.attachments)) {
      return ApiResponse.error(res, 'Attachments must be an array of strings.', 400);
    }
    if (req.body.attachments.length > 5) {
      return ApiResponse.error(res, 'Cannot attach more than 5 files per message.', 400);
    }
    for (const att of req.body.attachments) {
      if (typeof att !== 'string' || att.length > 500) {
        return ApiResponse.error(res, 'Attachment reference must be a string under 500 characters.', 400);
      }
      if (att.includes('..') || att.includes('\\') || att.includes('\0')) {
        return ApiResponse.error(res, 'Invalid attachment path or filename.', 400);
      }
    }
  }

  next();
};

module.exports = {
  validateAddMessage,
};
