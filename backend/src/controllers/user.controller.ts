import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model.js';
import { sendSuccess } from '../utils/response.js';
import { UnauthorizedError, NotFoundError } from '../errors/HttpErrors.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * GET /api/v1/users/me
 * Returns the authenticated citizen's full profile, KYC status, reputation scores, and bound devices.
 */
export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', ErrorCodes.UNAUTHORIZED);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new NotFoundError('User profile not found', ErrorCodes.NOT_FOUND);
    }

    sendSuccess(
      res,
      {
        id: user._id.toString(),
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        isNidVerified: user.isNidVerified,
        kycStatus: user.kycStatus,
        kycAttempts: user.kycAttempts,
        avatarUrl: user.avatarUrl || null,
        activeDeviceCount: user.activeDeviceCount,
        deviceUUIDs: user.deviceUUIDs,
        isBanned: user.isBanned,
        isFrozen: user.isFrozen,
        averageRating: user.averageRating,
        totalDealsCompleted: user.totalDealsCompleted,
        notificationPreferences: user.notificationPreferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      200,
      'Citizen profile retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/me/profile
 * Update citizen display name or avatar URL
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', ErrorCodes.UNAUTHORIZED);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new NotFoundError('User profile not found', ErrorCodes.NOT_FOUND);
    }

    const { displayName, avatarUrl } = req.body;
    if (displayName !== undefined) user.displayName = displayName;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    await user.save();

    sendSuccess(res, user, 200, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/me/notification-preferences
 * Update push, SMS, price drop alert preferences
 */
export const updateNotificationPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', ErrorCodes.UNAUTHORIZED);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new NotFoundError('User profile not found', ErrorCodes.NOT_FOUND);
    }

    user.notificationPreferences = {
      ...(user.notificationPreferences || {}),
      ...req.body
    };
    await user.save();

    sendSuccess(res, user.notificationPreferences, 200, 'Notification preferences updated successfully');
  } catch (error) {
    next(error);
  }
};

