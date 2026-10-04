const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');

const isProd = env.isProduction;

/**
 * Custom error handler for rate limit exceeded
 */
const rateLimitHandler = (message, retrySeconds) => (req, res) => {
  res.setHeader('Retry-After', retrySeconds);
  return ApiResponse.error(
    res,
    message,
    429,
    { retryAfterSeconds: retrySeconds },
    'RATE_LIMIT_EXCEEDED'
  );
};

/**
 * 1. Global API Rate Limiter
 * Production: 300 requests per 15 minutes per IP
 * Development/Test: 5000 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests from this IP. Please try again later.', 900),
});

/**
 * 2. Strict Authentication Rate Limiter
 * Production: 15 login/register attempts per 15 minutes per IP
 * Development/Test: 2000 attempts per 15 minutes
 * Protects against brute-force attacks and credential stuffing
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 15 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.', 900),
  skipSuccessfulRequests: false,
});

/**
 * 3. AI / RAG Rate Limiter
 * Production: 40 requests per minute per IP
 * Development/Test: 1000 requests per minute
 * Protects compute resources and LLM API limits from exhaustion
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 40 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('AI query rate limit reached. Please wait a minute before requesting another analysis.', 60),
});

module.exports = {
  apiLimiter,
  authLimiter,
  aiLimiter,
};
