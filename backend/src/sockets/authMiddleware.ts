import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token.js';
import { User } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

export interface SocketUser {
  userId: string;
  role: string;
  isNidVerified: boolean;
  isFrozen: boolean;
  displayName: string;
}

/**
 * Socket.io Handshake Authentication Middleware
 * Parses and verifies Access JWT. Rejects unauthorized, banned, or frozen users.
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: any) => void
): Promise<void> => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    let token = socket.handshake.auth?.token;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err: any) {
      return next(new Error('Invalid or expired authentication token'));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('User account not found'));
    }

    if (user.isBanned) {
      return next(new Error('Account has been suspended'));
    }

    if (user.isFrozen) {
      return next(new Error('Account is frozen due to an active dispute'));
    }

    socket.data.user = {
      userId: user._id.toString(),
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      displayName: user.displayName
    };

    next();
  } catch (error: any) {
    logger.error(`[SocketAuth] Handshake error: ${error.message}`);
    next(new Error('Internal socket authentication error'));
  }
};
