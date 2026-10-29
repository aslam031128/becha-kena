import { Router } from 'express';
import { z } from 'zod';
import {
  requestOtp,
  verifyOtp,
  refreshToken,
  logout,
  getMe
} from '../controllers/auth.controller.js';
import { otpRequestLimiter, otpVerifyLimiter } from '../middlewares/rateLimiter.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { isValidBdPhone } from '../utils/phone.js';

const router = Router();

const requestOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .refine((val) => isValidBdPhone(val), {
      message: 'Please enter a valid 11-digit Bangladeshi mobile number.'
    })
});

const verifyOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .refine((val) => isValidBdPhone(val), {
      message: 'Please enter a valid 11-digit Bangladeshi mobile number.'
    }),
  otp: z
    .string({ required_error: 'OTP is required.' })
    .regex(/^\d{6}$/, { message: 'OTP must be a 6-digit numeric string.' }),
  deviceUUID: z
    .string({ required_error: 'deviceUUID is required.' })
    .min(1, { message: 'deviceUUID cannot be empty.' }),
  deviceName: z.string().optional()
});

/**
 * @route   POST /api/v1/auth/request-otp
 * @desc    Generate and send 6-digit SMS OTP to Bangladeshi mobile number
 * @access  Public (Rate limited: 1/60s, max 5/24h)
 */
router.post('/request-otp', otpRequestLimiter, validateBody(requestOtpSchema), requestOtp);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify SMS OTP, upsert citizen, bind device, issue tokens
 * @access  Public (Rate limited: max 5 / 5 min)
 */
router.post('/verify-otp', otpVerifyLimiter, validateBody(verifyOtpSchema), verifyOtp);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Rotate access and refresh tokens using HTTP-Only refresh cookie
 * @access  Public (Reads cookie)
 */
router.post('/refresh-token', refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Invalidate refresh token family and clear session cookie
 * @access  Authenticated
 */
router.post('/logout', requireAuth, logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated citizen profile
 * @access  Authenticated
 */
router.get('/me', requireAuth, getMe);

export default router;
