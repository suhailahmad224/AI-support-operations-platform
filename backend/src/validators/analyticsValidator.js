const ApiResponse = require('../utils/apiResponse');

const ALLOWED_RANGES = ['7d', '30d', '90d', 'all'];

/**
 * Validate Analytics Query Parameters
 */
const validateAnalyticsQuery = (req, res, next) => {
  const { range, startDate, endDate } = req.query;
  const errors = [];

  if (range && !ALLOWED_RANGES.includes(range)) {
    errors.push(`range must be one of: ${ALLOWED_RANGES.join(', ')}`);
  }

  if (startDate) {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) {
      errors.push('startDate must be a valid ISO date string');
    }
  }

  if (endDate) {
    const d = new Date(endDate);
    if (isNaN(d.getTime())) {
      errors.push('endDate must be a valid ISO date string');
    }
  }

  if (startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      errors.push('startDate cannot be after endDate');
    }
  }

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  next();
};

module.exports = {
  validateAnalyticsQuery,
};
