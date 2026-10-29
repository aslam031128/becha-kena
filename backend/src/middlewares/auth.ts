import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/HttpErrors.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { User } from '../models/user.model.js';
import { RequestUser } from '../types/express.js';

/**
 * Extracts and verifies the Bearer JWT token from the Authorization header.
 * Attaches the authenticated user payload to req.user.
 * Rejects if missing, expired, malformed, or if the user account is banned.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required', ErrorCodes.UNAUTHORIZED);
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token is missing', ErrorCodes.UNAUTHORIZED);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired', ErrorCodes.TOKEN_EXPIRED);
      }
      throw new UnauthorizedError('Invalid access token', ErrorCodes.INVALID_TOKEN);
    }

    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Malformed access token payload', ErrorCodes.INVALID_TOKEN);
    }

    // Verify current user existence and ban status in database
    const user = await User.findById(decoded.userId).select(
      'phone role isNidVerified isFrozen isBanned'
    );

    if (!user) {
      throw new UnauthorizedError('User account not found', ErrorCodes.UNAUTHORIZED);
    }

    if (user.isBanned) {
      throw new ForbiddenError(
        'Your account has been permanently suspended',
        ErrorCodes.ACCOUNT_BANNED
      );
    }

    const requestUser: RequestUser = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      deviceId: decoded.deviceId
    };

    req.user = requestUser;
    next();
  } catch (error) {
    next(error);
  }
};
