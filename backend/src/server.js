const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 1b. Seed default demo accounts if not already present
    try {
      const User = require('./models/User');
      const defaultUsers = [
        { name: 'System Administrator', email: 'admin@platform.com', password: 'AdminPass123!', role: 'admin', department: 'Operations' },
        { name: 'Alex Support Agent', email: 'agent@platform.com', password: 'AgentPass123!', role: 'agent', department: 'Support' },
        { name: 'Jane Customer', email: 'customer@platform.com', password: 'CustomerPass123!', role: 'customer', department: 'General' },
      ];
      for (const u of defaultUsers) {
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
          await User.create(u);
          logger.info(`Auto-seeded demo account: ${u.email} [${u.role}]`);
        }
      }

      // Seed default knowledge base articles if collection is empty
      const Article = require('./models/Article');
      const articleCount = await Article.countDocuments();
      if (articleCount === 0) {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          const sampleArticles = [
            {
              title: 'How to Reset Your Account Password',
              slug: 'how-to-reset-account-password',
              category: 'account',
              tags: ['password', 'account', 'login', 'security', 'credentials'],
              isPublished: true,
              author: adminUser._id,
              content:
                'If you forget your password or need to update your login credentials, follow these instructions:\n\n' +
                '1. Navigate to the login screen and click the "Forgot Password" link beneath the password entry field.\n\n' +
                '2. Enter your verified account email address and click "Send Password Reset Link". You will receive an automated email within 2-3 minutes containing a secure single-use verification link.\n\n' +
                '3. Click the link and enter a new password that is at least 8 characters long, containing uppercase letters, numbers, and symbols.\n\n' +
                'If you are locked out due to multiple invalid password attempts, please contact your company administrator or open a support ticket.',
            },
            {
              title: 'Understanding Invoices, Billing Cycles, and Refunds',
              slug: 'understanding-invoices-and-refunds',
              category: 'billing',
              tags: ['billing', 'invoice', 'refund', 'subscription', 'payment', 'charge'],
              isPublished: true,
              author: adminUser._id,
              content:
                'Our billing operations run on automated calendar cycles according to your plan agreement:\n\n' +
                'Invoices are generated on the 1st of every month and automatically billed to your primary payment method on file (credit card, debit card, or ACH transfer).\n\n' +
                'To review past invoices or download PDF receipts, visit your Organization Dashboard under Billing & Plans. All itemized taxes, fees, and license seat allocations are clearly broken down.\n\n' +
                'Refund Policy: If you were billed in error or experienced verified service disruptions exceeding our SLA, refund requests submitted within 14 days of invoice generation are reviewed and processed back to your original payment method within 5-7 business days.',
            },
            {
              title: 'Troubleshooting 504 Gateway Timeouts and Server Errors',
              slug: 'troubleshooting-504-gateway-timeouts',
              category: 'technical',
              tags: ['504', 'gateway', 'timeout', '500', 'error', 'technical', 'latency'],
              isPublished: true,
              author: adminUser._id,
              content:
                'A 504 Gateway Timeout indicates that an upstream edge proxy or application server failed to respond within the designated execution window.\n\n' +
                'Step 1: Check System Status. Before modifying client configurations, check our public status dashboard to verify if a scheduled maintenance window or distributed latency event is currently active.\n\n' +
                'Step 2: Clear Local Cache. Corrupted proxy caches or stale browser sessions can trigger repeated request timeouts. Clear your browser cookies and DNS cache or test via an incognito window.\n\n' +
                'Step 3: Network Diagnostics. Execute a traceroute or curl request to test edge latency. If timeouts persist on specific POST/PUT endpoints during large file uploads, contact support with your IP address, timestamp, and request correlation ID.',
            },
            {
              title: 'Configuring Two-Factor Authentication (2FA) with Authenticator Apps',
              slug: 'configuring-two-factor-authentication',
              category: 'security',
              tags: ['2fa', 'authentication', 'security', 'authenticator', 'qr-code', 'backup-codes'],
              isPublished: true,
              author: adminUser._id,
              content:
                'Two-Factor Authentication (2FA) enhances account security by requiring a time-based one-time password (TOTP) in addition to your primary password.\n\n' +
                'How to enable 2FA:\n' +
                '1. Open your Profile Settings in the top-right user menu.\n' +
                '2. Click on the Security & Authentication tab.\n' +
                '3. Click "Enable Two-Factor Authentication" to display your unique enrollment QR code.\n\n' +
                'Using an authenticator app:\n' +
                'Install Google Authenticator, Microsoft Authenticator, or 1Password on your mobile device. Scan the QR code and enter the 6-digit code to confirm activation.\n\n' +
                'Backup Codes: Immediately copy and store the 8 emergency recovery codes in a secure password manager. If your phone is lost, recovery codes are the only way to recover access without administrator intervention.',
            },
          ];

          for (const art of sampleArticles) {
            await Article.create(art);
          }
          logger.info(`Auto-seeded ${sampleArticles.length} default Knowledge Base articles`);
        }
      }
    } catch (seedErr) {
      logger.warn('Non-fatal: could not auto-seed demo users/articles:', seedErr.message);
    }

    // 2. Start HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info('========================================================');
      logger.info(` AI Support & Operations Platform API Server running`);
      logger.info(` Port:        ${env.PORT}`);
      logger.info(` Environment: ${env.NODE_ENV}`);
      logger.info(` Health:      http://localhost:${env.PORT}/api/health`);
      logger.info('========================================================');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down gracefully...', err.message);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down immediately...', err.stack || err.message);
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing HTTP server.');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
    });
  }
});

startServer();
