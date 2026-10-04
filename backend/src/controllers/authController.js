const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const env = require('../config/env');

// Format user object for clean public projection
const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  avatar: user.avatar,
  isActive: user.isActive,
  assignedTicketsCount: user.assignedTicketsCount,
  createdAt: user.createdAt,
});

/**
 * Register a new customer account
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return ApiResponse.error(
        res,
        'An account with this email address already exists.',
        409,
        null,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    // Default registered users to 'customer' role
    const user = await User.create({
      name,
      email,
      password,
      role: 'customer',
      department: department || 'General',
    });

    const token = user.generateToken();

    logger.info(`User registered successfully: ${user.email} [${user.role}]`);

    return ApiResponse.success(
      res,
      {
        user: formatUserResponse(user),
        token,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login user and issue JWT
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Must explicitly select password because select: false is on schema
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return ApiResponse.error(
        res,
        'Invalid email or password.',
        401,
        null,
        'INVALID_CREDENTIALS'
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.error(
        res,
        'Invalid email or password.',
        401,
        null,
        'INVALID_CREDENTIALS'
      );
    }

    if (!user.isActive) {
      return ApiResponse.error(
        res,
        'Your account has been deactivated. Please contact an administrator.',
        403,
        null,
        'ACCOUNT_DEACTIVATED'
      );
    }

    const token = user.generateToken();

    logger.info(`User logged in: ${user.email} [${user.role}]`);

    return ApiResponse.success(
      res,
      {
        user: formatUserResponse(user),
        token,
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    return ApiResponse.success(
      res,
      {
        user: formatUserResponse(req.user),
      },
      'Current user profile retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user session
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  logger.info(`User logged out: ${req.user?.email || 'unknown'}`);
  return ApiResponse.success(res, null, 'Logged out successfully');
};

/**
 * Safe demo accounts seeder
 * POST /api/auth/seed
 */
const seedDemoUsers = async (req, res, next) => {
  try {
    if (env.isProduction) {
      return ApiResponse.error(
        res,
        'Database seeding is strictly disabled in production mode.',
        403,
        null,
        'SEEDING_DISABLED'
      );
    }
    const demoAccounts = [
      {
        name: 'System Administrator',
        email: 'admin@platform.com',
        password: 'AdminPass123!',
        role: 'admin',
        department: 'Operations',
      },
      {
        name: 'Alex Support Agent',
        email: 'agent@platform.com',
        password: 'AgentPass123!',
        role: 'agent',
        department: 'Support',
      },
      {
        name: 'Jane Customer',
        email: 'customer@platform.com',
        password: 'CustomerPass123!',
        role: 'customer',
        department: 'General',
      },
    ];

    const results = [];
    for (const acc of demoAccounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        user = await User.create(acc);
        results.push({ email: acc.email, role: acc.role, status: 'created' });
      } else {
        results.push({ email: acc.email, role: acc.role, status: 'already_exists' });
      }
    }

    return ApiResponse.success(
      res,
      { accounts: results },
      'Demo accounts seeded/verified'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  seedDemoUsers,
};
