import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { initSocketServer } from './sockets/socketServer.js';
import { initQueues, closeQueues } from './queues/index.js';
import { logger } from './utils/logger.js';

const bootstrap = async (): Promise<void> => {
  try {
    logger.info('🚀 Starting Becha-Kena Backend Server...');

    // 1. Initialize Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 2. Initialize Real-Time WebSockets
    initSocketServer(server);

    // 3. Connect to Infrastructure Services
    if (env.NODE_ENV !== 'test') {
      try {
        await connectDatabase();
      } catch (err: any) {
        logger.error(`Database connection deferred: ${err.message}`);
      }

      try {
        await connectRedis();
        await initQueues();
      } catch (err: any) {
        logger.error(`Redis or Queue initialization deferred: ${err.message}`);
      }
    }

    // 4. Start Listening
    server.listen(env.PORT, () => {
      logger.info(`🌐 Becha-Kena Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
      logger.info(`👉 Health Check: http://localhost:${env.PORT}/health`);
      logger.info(`👉 API Base:     http://localhost:${env.PORT}/api/v1`);
    });

    // 5. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.warn(`🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');

        try {
          await closeQueues();
          await disconnectDatabase();
          await disconnectRedis();
          logger.info('All database, queue, and redis connections cleanly closed.');
          process.exit(0);
        } catch (error: any) {
          logger.error(`Error during graceful shutdown: ${error.message}`);
          process.exit(1);
        }
      });

      // Force exit if not cleanly shut down within 10s
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err: Error) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (error: any) {
    logger.error(`Fatal server bootstrap error: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

bootstrap();
