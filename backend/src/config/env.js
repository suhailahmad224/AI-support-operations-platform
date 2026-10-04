const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret_not_for_prod';

// Production Security Guard: Refuse to start in production with insecure fallback secret
if (isProduction && (JWT_SECRET === 'dev_fallback_secret_not_for_prod' || JWT_SECRET.length < 32)) {
  throw new Error('FATAL SECURITY CONFIGURATION: JWT_SECRET must be explicitly set and at least 32 characters long in production mode.');
}

const env = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_support_platform',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AI_PROVIDER: process.env.AI_PROVIDER || 'mock',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@platform.com',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  isProduction,
  isDevelopment,
  isTest,
};

module.exports = env;
