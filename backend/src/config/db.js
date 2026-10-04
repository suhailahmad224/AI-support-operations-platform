const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let memoryServer = null;

/**
 * Connect to MongoDB with automatic dev fallback (Memory Server)
 * if standalone mongod is not reachable.
 */
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    // First attempt: Connect to configured MONGODB_URI with a short serverSelectionTimeoutMS
    logger.info(`Attempting MongoDB connection to: ${env.MONGODB_URI}`);
    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2500,
      });
      logger.info(`MongoDB Connected successfully to host: ${conn.connection.host} [DB: ${conn.connection.name}]`);
      return { host: conn.connection.host, inMemory: false };
    } catch (primaryErr) {
      if (env.isProduction) {
        throw primaryErr;
      }

      logger.warn(`External MongoDB at ${env.MONGODB_URI} not accessible (${primaryErr.message}).`);
      logger.info('Initializing in-memory MongoDB server for zero-config local development/testing...');

      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memoryUri = memoryServer.getUri();

      const conn = await mongoose.connect(memoryUri);
      logger.info(`In-Memory MongoDB started and connected: ${memoryUri}`);
      return { host: 'localhost (in-memory)', inMemory: true, uri: memoryUri };
    }
  } catch (error) {
    logger.error('CRITICAL: Failed to establish database connection:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    logger.info('Database disconnected cleanly');
  } catch (err) {
    logger.error('Error during database disconnect:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
