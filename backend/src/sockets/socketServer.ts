import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);

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
