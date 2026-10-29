import { Request, Response, NextFunction, RequestHandler } from 'express';
import rateLimit, { Options, RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore, RedisReply } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * Creates a RedisStore for express-rate-limit backed by the singleton ioredis client.
 */
export const createRedisStore = (prefix: string): RedisStore => {
  return new RedisStore({
    sendCommand: async (...args: string[]): Promise<RedisReply> => {
      const client = getRedisClient();
      return client.call(args[0], ...args.slice(1)) as Promise<RedisReply>;
    },
    prefix: `rl:${prefix}:`
  });
};

const getStore = (prefix: string) => {
  if (env.NODE_ENV === 'test') {
    return undefined; // In test mode, fallback to fast in-memory store unless specified
  }
  return createRedisStore(prefix);
};

/**
 * Standardized rate limit error response generator.
 */
const createRateLimitHandler = (
  defaultMessage: string,
  errorCode: string = ErrorCodes.RATE_LIMIT_EXCEEDED
) => {
  return (req: Request, res: Response, _next: NextFunction, options: Options): Response => {
    return sendError(
      res,
      options.statusCode || 429,
      errorCode,
      options.message || defaultMessage,
      undefined,
      req.originalUrl
    );
  };
};

/**
 * 1. Global Rate Limiter:
 * 100 requests / minute per IP across the entire application.
 */
export const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: getStore('global'),
  message: 'Too many requests from this IP. Please try again after 1 minute.',
  handler: createRateLimitHandler('Too many requests from this IP. Please try again after 1 minute.')
});

/**
 * Helper to extract phone number or fallback to IP.
 */
const getPhoneKey = (req: Request): string => {
  const phone = req.body?.phone?.toString()?.trim();
  return phone && phone.length > 0 ? phone : (req.ip || 'unknown-ip');
};

/**
 * Helper to extract user ID or fallback to IP.
 */
const getUserKey = (req: Request): string => {
  const userId = req.user?.userId;
  return userId && userId.length > 0 ? userId : (req.ip || 'unknown-ip');
};

/**
 * 2a. OTP Request Cooldown:
 * 1 request / 60 seconds per phone.
 */
export const otpRequestCooldownLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  limit: 1,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  keyGenerator: getPhoneKey,
  store: getStore('otp-cooldown'),
  validate: { xForwardedForHeader: false, default: false },
  message: 'Please wait 60 seconds before requesting another OTP.',
  handler: createRateLimitHandler(
    'Please wait 60 seconds before requesting another OTP.',
    ErrorCodes.RATE_LIMIT_EXCEEDED
  )
});

/**
 * 2b. OTP Request Daily Quota:
 * Max 5 requests / 24 hours per phone.
 */
export const otpRequestDailyLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  keyGenerator: getPhoneKey,
  store: getStore('otp-daily'),
  validate: { xForwardedForHeader: false, default: false },
  message: 'Daily OTP request limit reached. Maximum 5 requests allowed per 24 hours.',
  handler: createRateLimitHandler(
    'Daily OTP request limit reached. Maximum 5 requests allowed per 24 hours.',
    ErrorCodes.OTP_ATTEMPTS_EXCEEDED
  )
});

/**
 * 2. OTP Request Limiter (Composite):
 * Combines 60-second cooldown AND 24-hour daily quota (max 5) per phone number.
 */
export const otpRequestLimiter: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  otpRequestCooldownLimiter(req, res, (cooldownErr?: any) => {
    if (cooldownErr) {
      return next(cooldownErr);
    }
    otpRequestDailyLimiter(req, res, next);
  });
};

/**
 * 3. OTP Verification Limiter:
 * Max 5 attempts / 5 minutes per phone.
 */
export const otpVerifyLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  keyGenerator: getPhoneKey,
  store: getStore('otp-verify'),
  validate: { xForwardedForHeader: false, default: false },
  message: 'Too many failed verification attempts. Please try again after 5 minutes.',
  handler: createRateLimitHandler(
    'Too many failed verification attempts. Please try again after 5 minutes.',
    ErrorCodes.OTP_ATTEMPTS_EXCEEDED
  )
});

/**
 * 4. Listing Creation Limiter:
 * Max 5 listings / 24 hours per userId.
 */
export const listingCreateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  keyGenerator: getUserKey,
  store: getStore('listing-create'),
  validate: { xForwardedForHeader: false, default: false },
  message: 'Daily listing limit reached. Maximum 5 listings allowed per 24 hours.',
  handler: createRateLimitHandler(
    'Daily listing limit reached. Maximum 5 listings allowed per 24 hours.',
    ErrorCodes.LISTING_LIMIT_REACHED
  )
});

/**
 * 5. Phone Reveal Gate Limiter:
 * Max 10 reveals / 24 hours per userId.
 */
export const phoneRevealLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  keyGenerator: getUserKey,
  store: getStore('phone-reveal'),
  validate: { xForwardedForHeader: false, default: false },
  message: 'Daily phone number reveal limit reached. Maximum 10 reveals allowed per 24 hours.',
  handler: createRateLimitHandler(
    'Daily phone number reveal limit reached. Maximum 10 reveals allowed per 24 hours.',
    ErrorCodes.PHONE_REVEAL_LIMIT_EXCEEDED
  )
});
