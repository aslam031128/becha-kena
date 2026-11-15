import { Router } from 'express';
import { z } from 'zod';
import {
  requestPresignedUrl,
  confirmUpload,
  getPrivateDocumentUrl,
  serveMediaFile
} from '../controllers/upload.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { UploadContext } from '../constants/enums.js';

const router = Router();

const presignedUrlSchema = z.object({
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().positive().optional(),
  context: z.nativeEnum(UploadContext, {
    errorMap: () => ({ message: 'Invalid upload context' })
  })
}).refine((data) => data.fileType || data.mimeType, {
  message: 'fileType or mimeType is required',
  path: ['fileType']
});

const confirmUploadSchema = z.object({
  objectKey: z
    .string({ required_error: 'objectKey is required' })
    .min(1, 'objectKey cannot be empty'),
  context: z.nativeEnum(UploadContext).optional()
});

/**
 * @route   POST /api/v1/uploads/presigned-url
 * @desc    Request short-lived S3 pre-signed PUT URL
 * @access  Authenticated
 */
router.post('/presigned-url', requireAuth, validateBody(presignedUrlSchema), requestPresignedUrl);

/**
 * @route   POST /api/v1/uploads/confirm
 * @desc    Confirm direct-to-S3 upload completion
 * @access  Authenticated
 */
router.post('/confirm', requireAuth, validateBody(confirmUploadSchema), confirmUpload);

/**
 * @route   GET /api/v1/uploads/private-url
 * @desc    Get temporary signed GET URL for sensitive documents
 * @access  Authenticated (Owner or Staff)
 */
router.get('/private-url', requireAuth, getPrivateDocumentUrl);

/**
 * @route   GET /api/v1/uploads/file/*
 * @desc    Public streaming endpoint for public listings, avatars, and assets stored in S3
 * @access  Public
 */
router.get('/file/*', serveMediaFile);

export default router;

