const { redactSensitiveData } = require('./sanitize');

/**
 * Lightweight, structured, security-hardened logger.
 * Automatically redacts sensitive fields (passwords, tokens, keys).
 */
const formatTime = () => new Date().toISOString();

const sanitizeMeta = (meta) => {
  if (!meta) return '';
  if (typeof meta === 'object') {
    return redactSensitiveData(meta);
  }
  return meta;
};

const logger = {
  info: (message, meta = '') => {
    console.log(`[${formatTime()}] [INFO]  ${message}`, sanitizeMeta(meta));
  },
  warn: (message, meta = '') => {
    console.warn(`[${formatTime()}] [WARN]  ${message}`, sanitizeMeta(meta));
  },
  error: (message, error = '') => {
    console.error(`[${formatTime()}] [ERROR] ${message}`, sanitizeMeta(error));
  },
  debug: (message, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${formatTime()}] [DEBUG] ${message}`, sanitizeMeta(meta));
    }
  },
};

module.exports = logger;
