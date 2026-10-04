/**
 * Security & Sanitization Utilities
 */

/**
 * Escape regex special characters to prevent ReDoS and regex injection
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sensitive fields to redact from logs and audit records
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'token',
  'jwt',
  'secret',
  'authorization',
  'apikey',
  'gemini_api_key',
  'groq_api_key',
  'smtp_pass',
]);

/**
 * Deeply redact sensitive keys from any object or array
 * @param {*} data
 * @returns {*}
 */
const redactSensitiveData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Deeply strip keys starting with '$' or containing '.' to prevent NoSQL injection
 * @param {*} obj
 * @returns {*}
 */
const sanitizeNoSql = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeNoSql(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeNoSql(obj[key]);
    }
  }

  return obj;
};

module.exports = {
  escapeRegex,
  redactSensitiveData,
  sanitizeNoSql,
};
