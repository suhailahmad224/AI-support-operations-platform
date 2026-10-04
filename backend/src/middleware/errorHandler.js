const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Global centralized error handling middleware.
 * Security hardened: prevents reflection of user input and stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`, err.stack);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;
  let code = err.code || null;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map((val) => val.message);
    code = 'VALIDATION_ERROR';
  }

  // Handle Mongoose Duplicate Key (11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'resource';
    message = `Duplicate field value entered: ${field}. Must be unique.`;
    code = 'DUPLICATE_RESOURCE';
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Handle CastError (invalid ObjectId format) - avoid echoing back raw input
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier format';
    code = 'INVALID_ID_FORMAT';
  }

  // Production Security: Mask 500 unexpected internal error messages and details
  if (statusCode === 500 && env.isProduction) {
    message = 'An unexpected internal server error occurred';
    details = null;
    code = 'INTERNAL_SERVER_ERROR';
  }

  return ApiResponse.error(res, message, statusCode, details, code);
};

module.exports = errorHandler;
