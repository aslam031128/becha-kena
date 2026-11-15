import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { s3StorageService } from '../services/storage/s3.service.js';
import { scheduleVideoProcessing } from '../queues/mediaProcessing.queue.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { UnauthorizedError, BadRequestError } from '../errors/index.js';
import { UploadContext } from '../constants/enums.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * POST /api/v1/uploads/presigned-url
 * Generates short-lived (10-minute) S3 pre-signed PUT URL.
 * Binary media bypasses the Main Backend Server entirely.
 */
export const requestPresignedUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication is required to request presigned upload URLs.');
    }

    const { fileName, fileType, mimeType, fileSize, context } = req.body;
    const resolvedType = (fileType || mimeType || 'image/jpeg').toLowerCase().trim();
    const resolvedSize = typeof fileSize === 'number' && fileSize > 0 ? fileSize : 1024 * 500;
    const extFromMime = resolvedType.includes('png')
      ? '.png'
      : resolvedType.includes('webp')
        ? '.webp'
        : resolvedType.includes('mp4')
          ? '.mp4'
          : '.jpg';
    const resolvedName = fileName || `upload_${Date.now()}${extFromMime}`;

    const result = await s3StorageService.generatePresignedUploadUrl(
      userId,
      resolvedName,
      resolvedType,
      resolvedSize,
      context as UploadContext
    );

    sendSuccess(res, result, 200, 'Presigned upload URL generated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/uploads/confirm
 * Confirms direct S3 upload via S3 HeadObject check (existence & ownership).
 */
export const confirmUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication is required to confirm uploads.');
    }

    const { objectKey, context } = req.body;

    let resolvedContext = context as UploadContext;
    if (!resolvedContext) {
      if (objectKey.startsWith('public/listings/')) resolvedContext = UploadContext.LISTING_IMAGE;
      else if (objectKey.startsWith('public/videos/')) resolvedContext = UploadContext.LISTING_VIDEO;
      else if (objectKey.startsWith('public/avatars/')) resolvedContext = UploadContext.AVATAR;
      else if (objectKey.startsWith('private/kyc/')) resolvedContext = UploadContext.NID_FRONT;
      else if (objectKey.startsWith('private/disputes/')) resolvedContext = UploadContext.GD_DOCUMENT;
      else resolvedContext = UploadContext.LISTING_IMAGE;
    }

    const result = await s3StorageService.confirmUpload(
      userId,
      objectKey,
      resolvedContext
    );

    // Dynamic base URL for local development and LAN mobile testing
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' || req.secure ? 'https' : 'http';
    const dynamicBase = `${protocol}://${host}`;

    // If publicUrl points to non-existent domain or CDN is placeholder, provide local streaming route
    if (result.publicUrl && (result.publicUrl.includes('cdn.becha-kena.com') || !result.publicUrl.startsWith('http'))) {
      result.publicUrl = `${dynamicBase}/api/v1/uploads/file/${objectKey}`;
    }

    // If listing video uploaded, trigger background thumbnail & compression job
    if (resolvedContext === UploadContext.LISTING_VIDEO) {
      try {
        await scheduleVideoProcessing(userId, objectKey, context);
      } catch (err: any) {
        // Log error but do not fail the confirmation
        logger.error(`Failed to enqueue video processing: ${err.message}`);
      }
    }

    sendSuccess(res, result, 200, 'Upload confirmed successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/uploads/private-url
 * Generates short-lived (15-minute) signed GET URL for sensitive documents.
 * Restricted to document owner or authorized moderation staff.
 */
export const getPrivateDocumentUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!userId) {
      throw new UnauthorizedError('Authentication is required.');
    }

    const key = req.query.key as string;
    if (!key) {
      throw new BadRequestError('Storage object key is required.', ErrorCodes.VALIDATION_ERROR);
    }

    const result = await s3StorageService.generatePresignedGetUrl(userId, userRole || '', key);

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/uploads/file/*
 * Streams public images and media directly from S3.
 * Only public/* storage objects are accessible.
 */
export const serveMediaFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawKey = req.params[0] || (req.params as any).key;
    if (!rawKey) {
      res.status(404).send('Not Found');
      return;
    }
    const cleanKey = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, '').replace(/\\/g, '/');

    // Only allow public/* keys for public streaming
    if (!cleanKey.startsWith('public/')) {
      res.status(403).send('Forbidden: private documents require authenticated presigned access');
      return;
    }

    const { stream, contentType, contentLength } = await s3StorageService.getObjectStream(cleanKey);
    res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    (stream as NodeJS.ReadableStream).pipe(res);
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      res.status(404).send('File not found');
      return;
    }
    next(error);
  }
};

