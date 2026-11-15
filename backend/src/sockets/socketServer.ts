import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { socketAuthMiddleware } from './authMiddleware.js';
import { registerChatHandlers } from './chatHandler.js';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed =
          origin === env.CLIENT_URL ||
          origin === 'http://localhost:3000' ||
          origin === 'http://127.0.0.1:3000' ||
          /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):3000$/.test(origin);
        if (isAllowed || env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Attach Handshake Authentication Middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Socket connected: ${socket.id} (User: ${socket.data.user?.userId})`);

    // Register In-Flight Real-Time Chat Handlers
    registerChatHandlers(io!, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected (${socket.id}): ${reason}`);
    });
  });

  logger.info('✅ Socket.io initialized successfully');
  return io;
};

export const getSocketServer = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io server has not been initialized yet.');
  }
  return io;
};

export const getSocketServerOrNull = (): SocketIOServer | null => {
  return io;
};
