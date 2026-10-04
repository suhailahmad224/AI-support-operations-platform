const { sanitizeNoSql } = require('../utils/sanitize');

/**
 * Express Middleware to prevent NoSQL query operator injection
 * Sanitizes req.body, req.query, and req.params
 */
const nosqlSanitizer = (req, res, next) => {
  if (req.body) {
    sanitizeNoSql(req.body);
  }
  if (req.query) {
    sanitizeNoSql(req.query);
  }
  if (req.params) {
    sanitizeNoSql(req.params);
  }
  next();
};

module.exports = nosqlSanitizer;
