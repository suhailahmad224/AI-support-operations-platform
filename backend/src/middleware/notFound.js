const ApiResponse = require('../utils/apiResponse');

/**
 * 404 Route Not Found Middleware
 */
const notFound = (req, res) => {
  return ApiResponse.error(res, `Route not found: [${req.method}] ${req.originalUrl}`, 404, null, 'ROUTE_NOT_FOUND');
};

module.exports = notFound;
