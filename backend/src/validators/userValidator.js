const ApiResponse = require('../utils/apiResponse');

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const validRoles = ['customer', 'agent', 'admin'];
const validDepartments = ['Support', 'Engineering', 'Billing', 'Operations', 'General'];

const validateCreateUser = (req, res, next) => {
  const { name, email, password, role, department } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }

  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters');
  }

  if (role && !validRoles.includes(role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  if (department && !validDepartments.includes(department)) {
    errors.push(`Department must be one of: ${validDepartments.join(', ')}`);
  }

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

const validateUpdateUser = (req, res, next) => {
  const { name, role, department, isActive, assignedTicketsCount } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
  }

  if (role !== undefined && !validRoles.includes(role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  if (department !== undefined && !validDepartments.includes(department)) {
    errors.push(`Department must be one of: ${validDepartments.join(', ')}`);
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  if (assignedTicketsCount !== undefined && (typeof assignedTicketsCount !== 'number' || assignedTicketsCount < 0)) {
    errors.push('assignedTicketsCount must be a non-negative number');
  }

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  if (name) req.body.name = name.trim();
  next();
};

const validateUpdateMyProfile = (req, res, next) => {
  const { name, department, currentPassword, newPassword } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
  }

  if (department !== undefined && !validDepartments.includes(department)) {
    errors.push(`Department must be one of: ${validDepartments.join(', ')}`);
  }

  if (newPassword) {
    if (!currentPassword) {
      errors.push('Current password is required to set a new password');
    }
    if (newPassword.length < 6) {
      errors.push('New password must be at least 6 characters long');
    }
  }

  // Strictly prevent privilege escalation
  delete req.body.role;
  delete req.body.isActive;
  delete req.body.assignedTicketsCount;
  delete req.body.email;

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  if (name) req.body.name = name.trim();
  next();
};

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateUpdateMyProfile,
};
