const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

// Clean user projection formatter
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  avatar: user.avatar,
  isActive: user.isActive,
  assignedTicketsCount: user.assignedTicketsCount,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Get all users with pagination, search, and filtering
 * GET /api/users
 * Access: Admin only
 */
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const { role, department, status, search } = req.query;
    const filter = {};

    if (role && ['customer', 'agent', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (department && ['Support', 'Engineering', 'Billing', 'Operations', 'General'].includes(department)) {
      filter.department = department;
    }

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (search && search.trim()) {
      const cleanSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(cleanSearch, 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      avatar: u.avatar,
      isActive: u.isActive,
      assignedTicketsCount: u.assignedTicketsCount,
      createdAt: u.createdAt,
    }));

    return ApiResponse.paginated(
      res,
      formattedUsers,
      page,
      limit,
      total,
      'Users retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all support agents with workload and status
 * GET /api/agents
 * Access: Admin, Agent
 */
const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' })
      .select('-password')
      .sort({ assignedTicketsCount: 1, name: 1 })
      .lean();

    const formattedAgents = agents.map((agent) => ({
      id: agent._id,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      department: agent.department,
      avatar: agent.avatar,
      isActive: agent.isActive,
      assignedTicketsCount: agent.assignedTicketsCount || 0,
      createdAt: agent.createdAt,
    }));

    return ApiResponse.success(
      res,
      formattedAgents,
      'Agents directory retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 * Access: Admin or Self
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return ApiResponse.error(
        res,
        'Forbidden: You are not authorized to view this profile.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404, null, 'USER_NOT_FOUND');
    }

    return ApiResponse.success(res, sanitizeUser(user), 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create user / agent / admin
 * POST /api/users
 * Access: Admin only
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return ApiResponse.error(
        res,
        'An account with this email address already exists.',
        409,
        null,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      department: department || 'General',
    });

    logger.info(`Admin ${req.user.email} created user: ${user.email} [${user.role}]`);

    return ApiResponse.success(
      res,
      sanitizeUser(user),
      'User created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update user details
 * PUT /api/users/:id
 * Access: Admin only
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, department, isActive, assignedTicketsCount } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404, null, 'USER_NOT_FOUND');
    }

    // Safety rule: Admin cannot demote or deactivate their own account
    if (req.user._id.toString() === id) {
      if (role && role !== 'admin') {
        return ApiResponse.error(
          res,
          'You cannot demote your own administrator account.',
          400,
          null,
          'CANNOT_DEMOTE_SELF'
        );
      }
      if (isActive === false) {
        return ApiResponse.error(
          res,
          'You cannot deactivate your own administrator account.',
          400,
          null,
          'CANNOT_DEACTIVATE_SELF'
        );
      }
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (isActive !== undefined) user.isActive = isActive;
    if (assignedTicketsCount !== undefined) user.assignedTicketsCount = assignedTicketsCount;

    await user.save();
    logger.info(`Admin ${req.user.email} updated user: ${user.email}`);

    return ApiResponse.success(res, sanitizeUser(user), 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active/inactive status
 * PATCH /api/users/:id/status
 * Access: Admin only
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return ApiResponse.error(
        res,
        'You cannot alter the active status of your own account.',
        400,
        null,
        'CANNOT_MODIFY_SELF'
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404, null, 'USER_NOT_FOUND');
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`Admin ${req.user.email} toggled status for ${user.email} to: ${user.isActive ? 'ACTIVE' : 'DEACTIVATED'}`);

    return ApiResponse.success(
      res,
      sanitizeUser(user),
      `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * DELETE /api/users/:id
 * Access: Admin only
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return ApiResponse.error(
        res,
        'You cannot delete your own account.',
        400,
        null,
        'CANNOT_DELETE_SELF'
      );
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404, null, 'USER_NOT_FOUND');
    }

    logger.info(`Admin ${req.user.email} deleted user: ${user.email}`);

    return ApiResponse.success(
      res,
      { id: user._id, email: user.email },
      'User deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update current authenticated user profile
 * PUT /api/users/profile/me
 * Access: Any authenticated user (Self)
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { name, department, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404, null, 'USER_NOT_FOUND');
    }

    if (name) user.name = name;
    if (department) user.department = department;

    // Optional password change
    if (newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return ApiResponse.error(
          res,
          'Current password does not match.',
          400,
          null,
          'INVALID_CURRENT_PASSWORD'
        );
      }
      user.password = newPassword;
    }

    await user.save();
    logger.info(`User updated own profile: ${user.email}`);

    return ApiResponse.success(
      res,
      sanitizeUser(user),
      'Profile updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getAgents,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  updateMyProfile,
};
