import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';
import { RequestUser } from '../types/express.js';
import { CookieOptions } from 'express';

export interface TokenFamilyRecord {
  userId: string;
  familyId: string;
  deviceId: string;
}

export interface ActiveFamilyRecord {
  activeToken: string;
  userId: string;
  deviceId: string;
}

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days = 2,592,000 seconds
export const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;
export const USED_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours for reuse detection tombstone
export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60; // 900 seconds (15 minutes)

export const getRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: REFRESH_TOKEN_TTL_MS
});

/**
 * Signs a 15-minute Access JWT with citizen identity and device metadata.
 */
export const signAccessToken = (payload: {
  userId: string;
  role: string;
  isNidVerified: boolean;
  isFrozen: boolean;
  deviceId: string;
}): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '15m'
  });
};

/**
 * Verifies an Access JWT and returns decoded payload.
 */
export const verifyAccessToken = (token: string): RequestUser => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as RequestUser;
};

/**
 * Creates a new refresh token family for a fresh login session and stores it in Redis.
 */
export const createTokenFamily = async (
  userId: string,
  deviceId: string
): Promise<{ refreshToken: string; familyId: string }> => {
  const redis = getRedisClient();
  const familyId = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(40).toString('hex');

  const tokenRecord: TokenFamilyRecord = { userId, familyId, deviceId };
  const familyRecord: ActiveFamilyRecord = { activeToken: refreshToken, userId, deviceId };

  await redis.set(
    `refresh_token:${refreshToken}`,
    JSON.stringify(tokenRecord),
    'EX',
    REFRESH_TOKEN_TTL_SECONDS
  );

  await redis.set(
    `refresh_family:${familyId}`,
    JSON.stringify(familyRecord),
    'EX',
    REFRESH_TOKEN_TTL_SECONDS
  );

  return { refreshToken, familyId };
};

export type RotateTokenResult =
  | { status: 'success'; newRefreshToken: string; userId: string; deviceId: string }
  | { status: 'reuse_detected'; familyId: string; userId: string }
  | { status: 'invalid' };

/**
 * Validates and rotates a refresh token within its family.
 * If token reuse is detected, revokes the entire token family.
 */
export const rotateRefreshTokenFamily = async (
  presentedToken: string
): Promise<RotateTokenResult> => {
  const redis = getRedisClient();

  // 1. Check if token is currently active
  const activeRecordJson = await redis.get(`refresh_token:${presentedToken}`);

  if (!activeRecordJson) {
    // 2. Not active — check if it is a tombstoned (used) token for reuse detection
    const usedRecordJson = await redis.get(`used_refresh_token:${presentedToken}`);
    if (usedRecordJson) {
      const { familyId, userId } = JSON.parse(usedRecordJson);

      // TOKEN REUSE DETECTED: Revoke entire token family immediately!
      const familyJson = await redis.get(`refresh_family:${familyId}`);
      if (familyJson) {
        const { activeToken } = JSON.parse(familyJson);
        await redis.del(`refresh_token:${activeToken}`);
      }
      await redis.del(`refresh_family:${familyId}`);

      return { status: 'reuse_detected', familyId, userId };
    }

    return { status: 'invalid' };
  }

  const tokenRecord: TokenFamilyRecord = JSON.parse(activeRecordJson);
  const { userId, familyId, deviceId } = tokenRecord;

  // 3. Generate rotated token
  const newRefreshToken = crypto.randomBytes(40).toString('hex');

  // 4. Mark old token as used (with 24h tombstone window for reuse detection)
  await redis.set(
    `used_refresh_token:${presentedToken}`,
    JSON.stringify({ familyId, userId }),
    'EX',
    USED_TOKEN_TTL_SECONDS
  );
  await redis.del(`refresh_token:${presentedToken}`);

  // 5. Save new token and update active token for the family
  const newTokenRecord: TokenFamilyRecord = { userId, familyId, deviceId };
  const updatedFamilyRecord: ActiveFamilyRecord = { activeToken: newRefreshToken, userId, deviceId };

  await redis.set(
    `refresh_token:${newRefreshToken}`,
    JSON.stringify(newTokenRecord),
    'EX',
    REFRESH_TOKEN_TTL_SECONDS
  );

  await redis.set(
    `refresh_family:${familyId}`,
    JSON.stringify(updatedFamilyRecord),
    'EX',
    REFRESH_TOKEN_TTL_SECONDS
  );

  return {
    status: 'success',
    newRefreshToken,
    userId,
    deviceId
  };
};

/**
 * Revokes an individual refresh token and its parent token family upon logout.
 */
export const revokeRefreshTokenFamily = async (refreshToken: string): Promise<void> => {
  const redis = getRedisClient();

  const activeRecordJson = await redis.get(`refresh_token:${refreshToken}`);
  if (activeRecordJson) {
    const { familyId } = JSON.parse(activeRecordJson);
    await redis.del(`refresh_token:${refreshToken}`);
    await redis.del(`refresh_family:${familyId}`);
  }

  const usedRecordJson = await redis.get(`used_refresh_token:${refreshToken}`);
  if (usedRecordJson) {
    const { familyId } = JSON.parse(usedRecordJson);
    await redis.del(`used_refresh_token:${refreshToken}`);
    await redis.del(`refresh_family:${familyId}`);
  }
};
