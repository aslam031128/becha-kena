import { Router } from 'express';
import { z } from 'zod';
import {
  ocr,
  verifyNid,
  getStatus,
  rebindPhone,
  verifyNewDevice
} from '../controllers/kyc.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { ocrUploadFields } from '../middlewares/upload.js';
import { isValidBdPhone } from '../utils/phone.js';
import { BD_NID_REGEX } from '../constants/regex.js';

const router = Router();

const verifyNidSchema = z.object({
  nidNumber: z
    .string({ required_error: 'National ID number is required.' })
    .trim()
    .regex(BD_NID_REGEX, {
      message: 'NID must be 10-digit Smart Card or 13/17-digit legacy National ID.'
    }),
  dob: z
    .string({ required_error: 'Date of birth is required.' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Date of birth must be in YYYY-MM-DD format.'
    }),
  frontImageKey: z.string().optional(),
  backImageKey: z.string().optional(),
  liveSelfieKey: z.string().optional(),
  liveSelfieBase64: z.string().optional(),
  livenessMeta: z
    .object({
      blinkDetected: z.boolean().optional(),
      headTurnDetected: z.boolean().optional(),
      confidence: z.number().optional()
    })
    .optional()
});

const rebindPhoneSchema = z.object({
  newPhone: z
    .string({ required_error: 'New mobile phone number is required.' })
    .trim()
    .refine((val) => isValidBdPhone(val), {
      message: 'Please enter a valid 11-digit Bangladeshi mobile number.'
    }),
  phoneOtp: z
    .string({ required_error: 'Phone OTP is required.' })
    .regex(/^\d{6}$/, { message: 'OTP must be a 6-digit numeric string.' }),
  nidNumber: z
    .string({ required_error: 'National ID number is required.' })
    .trim()
    .regex(BD_NID_REGEX, {
      message: 'NID must be 10-digit Smart Card or 13/17-digit legacy National ID.'
    }),
  dob: z
    .string({ required_error: 'Date of birth is required.' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Date of birth must be in YYYY-MM-DD format.'
    }),
  liveSelfieKey: z.string().optional(),
  liveSelfieBase64: z.string().optional()
});

const verifyNewDeviceSchema = z.object({
  deviceUUID: z
    .string({ required_error: 'deviceUUID is required.' })
    .min(1, { message: 'deviceUUID cannot be empty.' }),
  deviceName: z.string().optional(),
  liveSelfieKey: z.string().optional(),
  liveSelfieBase64: z.string().optional()
});

/**
 * @route   POST /api/v1/kyc/ocr
 * @desc    Extract NID number & DOB from front and back card images
 * @access  Authenticated (Multipart/form-data)
 */
router.post('/ocr', requireAuth, ocrUploadFields, ocr);

/**
 * @route   POST /api/v1/kyc/verify-nid
 * @desc    Primary zero-knowledge fast E-KYC pipeline
 * @access  Authenticated
 */
router.post('/verify-nid', requireAuth, validateBody(verifyNidSchema), verifyNid);

/**
 * @route   GET /api/v1/kyc/status
 * @desc    Get current KYC verification state & queue SLA
 * @access  Authenticated
 */
router.get('/status', requireAuth, getStatus);

/**
 * @route   POST /api/v1/kyc/rebind-phone
 * @desc    Lost SIM recovery via NID + high-confidence biometric facial match
 * @access  Public
 */
router.post('/rebind-phone', validateBody(rebindPhoneSchema), rebindPhone);

/**
 * @route   POST /api/v1/kyc/verify-new-device
 * @desc    "New Phone, Same SIM" device authorization via biometric selfie challenge
 * @access  Authenticated
 */
router.post('/verify-new-device', requireAuth, validateBody(verifyNewDeviceSchema), verifyNewDevice);

export default router;
