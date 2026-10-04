const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

/**
 * Protect middleware: Ensures the request carries a valid Bearer JWT.
 * Attaches the authenticated User instance to `req.user`.
 */
const protect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.error(
      res,
      'Access denied. No authentication token provided.',
      401,
      null,
      'AUTH_TOKEN_MISSING'
    );
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Look up user by ID; exclude password hash
    const user = await User.findById(decoded.id);

    if (!user) {
      return ApiResponse.error(
        res,
        'The user belonging to this token no longer exists.',
        401,
        null,
        'USER_NOT_FOUND'
      );
    }

    if (!user.isActive) {
      return ApiResponse.error(
        res,
        'Your account has been deactivated. Please contact support.',
        403,
        null,
        'ACCOUNT_DEACTIVATED'
      );
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(
        res,
        'Authentication token has expired. Please log in again.',
        401,
        null,
        'TOKEN_EXPIRED'
      );
    }
    return ApiResponse.error(
      res,
      'Invalid authentication token.',
      401,
      null,
      'INVALID_TOKEN'
    );
  }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * Verifies that the authenticated user possesses one of the authorized roles.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(
        res,
        'Authentication required.',
        401,
        null,
        'UNAUTHENTICATED'
      );
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${roles.join(', ')}]`,
        403,
        null,
        'FORBIDDEN_ROLE'
      );
    }

    next();
  };
};

/**
 * Optional authentication: Extracts user if token is provided, otherwise continues as unauthenticated.
 */
const optionalAuth = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
};
