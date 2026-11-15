import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Disable Mongoose query buffering globally so queries fail-fast when MongoDB is offline
mongoose.set('bufferCommands', false);

let memoryServer: any = null;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    mongoose.set('strictQuery', true);
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 3000,
      autoIndex: env.NODE_ENV !== 'production'
    });

    logger.info(`✅ MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    // In local development or test mode, automatically start embedded In-Memory MongoDB if local service isn't running
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      logger.warn(`⚠️ Local MongoDB (${env.MONGODB_URI}) not reachable. Launching embedded In-Memory MongoDB Server...`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'becha-kena'
          }
        });
        const memoryUri = memoryServer.getUri();
        const conn = await mongoose.connect(memoryUri, {
          autoIndex: true
        });
        logger.info(`✅ Embedded In-Memory MongoDB Server connected! (db: becha-kena)`);
        return conn;
      } catch (memErr: any) {
        logger.error(`❌ Embedded MongoDB failed to launch: ${memErr.message}`);
      }
    }

    logger.error(`❌ MongoDB Connection Failed: ${error.message}`);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected gracefully.');
    }
    if (memoryServer) {
      await memoryServer.stop();
      logger.info('Embedded MongoDB stopped.');
      memoryServer = null;
    }
  } catch (error: any) {
    logger.error(`Error disconnecting MongoDB: ${error.message}`);
  }
};

// Register graceful disconnect for process termination
process.on('SIGTERM', async () => {
  await disconnectDatabase();
});

