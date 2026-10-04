const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const env = require('./config/env');
const ApiResponse = require('./utils/apiResponse');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const nosqlSanitizer = require('./middleware/sanitize');
const { apiLimiter, authLimiter, aiLimiter } = require('./middleware/rateLimiter');

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", env.CLIENT_URL],
          },
        }
      : false, // In dev, Vite handles HMR scripts
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'same-origin' },
  })
);

// 2. Strict Cross-Origin Resource Sharing (CORS)
const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (env.isDevelopment && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Body Parsers with conservative payload boundaries (2MB)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. NoSQL Operator Injection Sanitizer
app.use(nosqlSanitizer);

// 5. Rate Limiting
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/articles/rag', aiLimiter);

// 6. Request Logging
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else if (!env.isTest) {
  app.use(morgan('combined'));
}

// Root route
app.get('/', (req, res) => {
  return ApiResponse.success(
    res,
    {
      name: 'AI Support & Operations Platform API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/api/health',
    },
    'AI Support Platform API Gateway Online'
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const healthData = {
    status: dbState === 1 ? 'healthy' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: {
      status: states[dbState] || 'unknown',
      name: mongoose.connection.name || 'n/a',
    },
    aiProvider: env.AI_PROVIDER,
  };

  const statusCode = dbState === 1 ? 200 : 503;
  return ApiResponse.success(res, healthData, 'System Health Check', statusCode);
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const agentRoutes = require('./routes/agentRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const articleRoutes = require('./routes/articleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const testRoutes = require('./routes/testRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/test', testRoutes);

// 404 Route Catch-all
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
