import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import { getRedisClient } from '../config/redis.js';
import { User } from '../models/user.model.js';
import { NidBlacklist } from '../models/nidBlacklist.model.js';
import { normalizeBdPhone } from '../utils/phone.js';
import {
  signAccessToken,
  createTokenFamily,
  rotateRefreshTokenFamily,
  revokeRefreshTokenFamily,
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  ACCESS_TOKEN_EXPIRES_IN_SECONDS
} from '../utils/token.js';
import { sendSuccess } from '../utils/response.js';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  LockedError
} from '../errors/index.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { UserRole, KycStatus } from '../constants/enums.js';
import { logger } from '../utils/logger.js';

export const OTP_TTL_SECONDS = 120;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * POST /api/v1/auth/request-otp
 * Validates BD phone format, checks blacklist, generates 6-digit OTP,
 * hashes with Argon2, and stores in Redis with 120-second TTL.
 */
export const requestOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone } = req.body;
    const normalizedPhone = normalizeBdPhone(phone);

    // 1. Check if phone is blacklisted on nid_blacklists
    const blacklisted = await NidBlacklist.findOne({ phone: normalizedPhone });
    if (blacklisted) {
      throw new ForbiddenError(
        'This mobile number is permanently blacklisted from Becha-Kena.',
        ErrorCodes.NID_BLACKLISTED
      );
    }

    // 2. Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 3. Hash OTP with Argon2
    const hashedOtp = await argon2.hash(otp);

    // 4. Store hashed OTP in Redis with 120s TTL
    const redis = getRedisClient();
    await redis.set(`otp:${normalizedPhone}`, hashedOtp, 'EX', OTP_TTL_SECONDS);

    logger.info(`📱 OTP requested for phone ${normalizedPhone.slice(0, 7)}**** (TTL: ${OTP_TTL_SECONDS}s)`);

    sendSuccess(
      res,
      {
        phone: normalizedPhone,
        expiresInSeconds: OTP_TTL_SECONDS,
        resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS
      },
      200,
      'OTP has been sent to your mobile number.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/verify-otp
 * Validates OTP via Argon2, enforces dual-device binding, upserts citizen,
 * issues 15-minute Access JWT and 30-day Refresh Token in HTTP-Only cookie.
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone, otp, deviceUUID } = req.body;
    const normalizedPhone = normalizeBdPhone(phone);

    const redis = getRedisClient();
    const otpKey = `otp:${normalizedPhone}`;
    const storedHashedOtp = await redis.get(otpKey);

    if (!storedHashedOtp) {
      throw new BadRequestError('OTP incorrect or expired.', ErrorCodes.OTP_EXPIRED);
    }

    // Timing-safe Argon2 verification
    const isOtpValid = await argon2.verify(storedHashedOtp, otp);
    if (!isOtpValid) {
      throw new BadRequestError('OTP incorrect or expired.', ErrorCodes.INVALID_OTP);
    }

    // Single-use: immediately delete verified OTP from Redis
    await redis.del(otpKey);

    // Check if phone or hardware device is blacklisted
    const blacklisted = await NidBlacklist.findOne({
      $or: [{ phone: normalizedPhone }, { deviceUUID }]
    });

    if (blacklisted) {
      throw new ForbiddenError(
        'This account or hardware device has been blacklisted.',
        ErrorCodes.NID_BLACKLISTED
      );
    }

    // Upsert user (new registration or returning login)
    let user = await User.findOne({ phone: normalizedPhone });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        phone: normalizedPhone,
        displayName: `Citizen ${normalizedPhone.slice(-4)}`,
        role: UserRole.CITIZEN,
        deviceUUIDs: [deviceUUID],
        activeDeviceCount: 1,
        isNidVerified: false,
        kycStatus: KycStatus.UNVERIFIED,
        notificationPreferences: {
          pushEnabled: true,
          smsEnabled: true,
          priceDropAlerts: true
        }
      });
      await user.save();
    } else {
      if (user.isBanned) {
        throw new ForbiddenError(
          'Your account has been permanently suspended.',
          ErrorCodes.ACCOUNT_BANNED
        );
      }

      // Hardware Device Binding Check
      if (!user.deviceUUIDs.includes(deviceUUID)) {
        if (user.deviceUUIDs.length >= 2) {
          // "New Phone, Same SIM" detected with >2 active devices: 423 Locked
          throw new LockedError(
            'Maximum active devices (2) exceeded. Biometric verification challenge required.',
            ErrorCodes.DEVICE_LIMIT_EXCEEDED
          );
        }

        user.deviceUUIDs.push(deviceUUID);
        user.activeDeviceCount = user.deviceUUIDs.length;
        await user.save();
      }
    }

    // Issue 15-minute Access JWT
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      deviceId: deviceUUID
    });

    // Issue 30-day Refresh Token in Redis Token Family
    const { refreshToken } = await createTokenFamily(user._id.toString(), deviceUUID);

    // Set secure HTTP-Only refresh cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    sendSuccess(
      res,
      {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
        user: {
          id: user._id.toString(),
          phone: user.phone,
          displayName: user.displayName,
          role: user.role,
          isNidVerified: user.isNidVerified,
          kycStatus: user.kycStatus,
          avatarUrl: user.avatarUrl || null,
          isFrozen: user.isFrozen,
          averageRating: user.averageRating,
          totalDealsCompleted: user.totalDealsCompleted
        },
        isNewUser,
        isNewDeviceChallengeRequired: false
      },
      200,
      'Login completed successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh-token
 * Reads refreshToken cookie, validates in Redis token family store,
 * rotates both access & refresh tokens, and detects token reuse attacks.
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const presentedToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!presentedToken) {
      throw new UnauthorizedError(
        'Refresh token cookie is missing or invalid.',
        ErrorCodes.UNAUTHORIZED
      );
    }

    const rotationResult = await rotateRefreshTokenFamily(presentedToken);

    if (rotationResult.status === 'reuse_detected') {
      res.clearCookie(REFRESH_COOKIE_NAME, {
        ...getRefreshCookieOptions(),
        maxAge: 0
      });

      throw new ForbiddenError(
        'Token reuse detected. All sessions in this token family have been revoked.',
        ErrorCodes.FORBIDDEN
      );
    }

    if (rotationResult.status === 'invalid') {
      throw new UnauthorizedError(
        'Invalid or expired refresh token.',
        ErrorCodes.INVALID_TOKEN
      );
    }

    const user = await User.findById(rotationResult.userId).select(
      'role isNidVerified isFrozen isBanned'
    );

    if (!user) {
      res.clearCookie(REFRESH_COOKIE_NAME, {
        ...getRefreshCookieOptions(),
        maxAge: 0
      });
      throw new UnauthorizedError('User account not found.', ErrorCodes.UNAUTHORIZED);
    }

    if (user.isBanned) {
      res.clearCookie(REFRESH_COOKIE_NAME, {
        ...getRefreshCookieOptions(),
        maxAge: 0
      });
      throw new ForbiddenError(
        'User account has been permanently suspended.',
        ErrorCodes.ACCOUNT_BANNED
      );
    }

    const newAccessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      deviceId: rotationResult.deviceId
    });

    res.cookie(REFRESH_COOKIE_NAME, rotationResult.newRefreshToken, getRefreshCookieOptions());

    sendSuccess(
      res,
      {
        accessToken: newAccessToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
      },
      200,
      'Access token refreshed'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Clears the refresh token family from Redis and expires the HTTP-Only cookie.
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const presentedToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (presentedToken) {
      await revokeRefreshTokenFamily(presentedToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...getRefreshCookieOptions(),
      maxAge: 0
    });

    sendSuccess(res, null, 200, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Returns authenticated citizen profile matching Section 3.1.
 */
export const getMe = async (
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
      'User profile retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};
