import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { UploadContext } from '../../constants/enums.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/index.js';

export interface ContextConfig {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  isPrivate: boolean;
  folder: string;
}

export const UPLOAD_CONTEXT_CONFIGS: Record<UploadContext, ContextConfig> = {
  [UploadContext.LISTING_IMAGE]: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    isPrivate: false,
    folder: 'public/listings'
  },
  [UploadContext.LISTING_VIDEO]: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['video/mp4', 'video/webm'],
    allowedExtensions: ['.mp4', '.webm'],
    isPrivate: false,
    folder: 'public/videos'
  },
  [UploadContext.AVATAR]: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    isPrivate: false,
    folder: 'public/avatars'
  },
  [UploadContext.NID_FRONT]: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    isPrivate: true,
    folder: 'private/kyc'
  },
  [UploadContext.NID_BACK]: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    isPrivate: true,
    folder: 'private/kyc'
  },
  [UploadContext.GD_DOCUMENT]: {
    maxSizeBytes: 8 * 1024 * 1024, // 8MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
    isPrivate: true,
    folder: 'private/disputes'
  }
};

export interface PresignedUploadResult {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string | null;
  isPrivate: boolean;
  expiresInSeconds: number;
  method: 'PUT';
}

export interface ConfirmedUploadResult {
  objectKey: string;
  publicUrl: string | null;
  isPrivate: boolean;
  sizeBytes: number;
  mimeType: string;
  confirmedAt: string;
}

export class S3StorageService {
  private s3Client: S3Client;
  private isMock: boolean;
  // In-memory registry for mock/testing environments
  private mockObjects = new Map<string, { sizeBytes: number; mimeType: string; createdAt: Date }>();

  constructor() {
    this.isMock = env.NODE_ENV === 'test' || env.AWS_ACCESS_KEY_ID === 'mock_aws_access_key_id';
    this.s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  /**
   * Helper to set mock object state in automated tests
   */
  public seedMockObject(objectKey: string, sizeBytes: number, mimeType: string): void {
    this.mockObjects.set(objectKey, { sizeBytes, mimeType, createdAt: new Date() });
  }

  public deleteMockObject(objectKey: string): void {
    this.mockObjects.delete(objectKey);
  }

  public clearMockObjects(): void {
    this.mockObjects.clear();
  }

  /**
   * Generates a pre-signed PUT URL for direct client-to-storage upload.
   * Main Backend Server NEVER handles or proxies the media binary.
   */
  async generatePresignedUploadUrl(
    userId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    context: UploadContext
  ): Promise<PresignedUploadResult> {
    const config = UPLOAD_CONTEXT_CONFIGS[context];
    if (!config) {
      throw new BadRequestError(`Unsupported upload context: ${context}`, ErrorCodes.VALIDATION_ERROR);
    }

    // 1. File size validation
    if (fileSize > config.maxSizeBytes) {
      const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(0);
      throw new BadRequestError(
        `File size (${(fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of ${maxMb}MB for ${context}.`,
        ErrorCodes.UPLOAD_FILE_TOO_LARGE
      );
    }

    // 2. MIME type validation
    const normalizedMime = fileType.toLowerCase().trim();
    if (!config.allowedMimeTypes.includes(normalizedMime)) {
      throw new BadRequestError(
        `Invalid MIME type '${fileType}'. Allowed types for ${context}: ${config.allowedMimeTypes.join(', ')}`,
        ErrorCodes.UPLOAD_INVALID_FILE_TYPE
      );
    }

    // 3. Extension validation
    const ext = path.extname(fileName).toLowerCase();
    if (!ext || !config.allowedExtensions.includes(ext)) {
      throw new BadRequestError(
        `Invalid file extension '${ext}'. Allowed extensions for ${context}: ${config.allowedExtensions.join(', ')}`,
        ErrorCodes.UPLOAD_INVALID_FILE_TYPE
      );
    }

    // 4. Generate unique, unpredictable storage object key
    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomUuid = crypto.randomUUID();
    const objectKey = `${config.folder}/${userId}/${randomUuid}-${sanitizedBase}${ext}`;

    const expiresInSeconds = 600; // 10 minutes

    let uploadUrl: string;

    if (this.isMock) {
      // In mock/test environments, create a realistic mock pre-signed S3 URL
      uploadUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${objectKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresInSeconds}&mockSignature=${randomUuid}`;
      // Seed default mock object for direct confirmation in tests
      this.seedMockObject(objectKey, fileSize, normalizedMime);
    } else {
      const command = new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: objectKey,
        ContentType: normalizedMime
      });
      uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    }

    const cdnBase = env.CDN_BASE_URL.replace(/\/+$/, '');
    const publicUrl = config.isPrivate ? null : `${cdnBase}/${objectKey}`;

    logger.info(`Generated presigned upload URL for key: ${objectKey} by user ${userId}`);

    return {
      uploadUrl,
      objectKey,
      publicUrl,
      isPrivate: config.isPrivate,
      expiresInSeconds,
      method: 'PUT'
    };
  }

  /**
   * Confirms that the client uploaded the file directly to S3.
   * Verifies existence, ownership prefix, and size boundaries using S3 HeadObject.
   */
  async confirmUpload(
    userId: string,
    objectKey: string,
    context: UploadContext
  ): Promise<ConfirmedUploadResult> {
    const config = UPLOAD_CONTEXT_CONFIGS[context];
    if (!config) {
      throw new BadRequestError(`Unsupported upload context: ${context}`, ErrorCodes.VALIDATION_ERROR);
    }

    // 1. Verify path prefix and ownership
    const expectedPrefix = `${config.folder}/${userId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new ForbiddenError(
        'Upload ownership violation: You are not authorized to confirm this object key.',
        ErrorCodes.FORBIDDEN
      );
    }

    let sizeBytes = 0;
    let mimeType = '';

    if (this.isMock) {
      const mockMeta = this.mockObjects.get(objectKey);
      if (!mockMeta) {
        throw new NotFoundError(
          `Uploaded object '${objectKey}' not found in object storage. Please ensure the client PUT request succeeded.`,
          ErrorCodes.UPLOAD_CONFIRMATION_FAILED
        );
      }
      sizeBytes = mockMeta.sizeBytes;
      mimeType = mockMeta.mimeType;
    } else {
      try {
        const head = await this.s3Client.send(
          new HeadObjectCommand({
            Bucket: env.AWS_S3_BUCKET,
            Key: objectKey
          })
        );
        sizeBytes = head.ContentLength || 0;
        mimeType = head.ContentType || '';
      } catch (err: any) {
        logger.error(`S3 HeadObject failed for key ${objectKey}: ${err.message}`);
        if (env.NODE_ENV === 'development') {
          logger.warn(`⚠️ S3 HeadObject check deferred in development mode. Assuming valid upload.`);
          sizeBytes = 1024 * 50;
          mimeType = 'image/jpeg';
        } else {
          throw new NotFoundError(
            `Uploaded object '${objectKey}' not found in storage. Please verify upload completion.`,
            ErrorCodes.UPLOAD_CONFIRMATION_FAILED
          );
        }
      }
    }

    // Validate size within bounds
    if (sizeBytes > config.maxSizeBytes) {
      throw new BadRequestError(
        `Uploaded object exceeds maximum allowable size for ${context}.`,
        ErrorCodes.UPLOAD_FILE_TOO_LARGE
      );
    }

    const cdnBase = env.CDN_BASE_URL.replace(/\/+$/, '');
    const publicUrl = config.isPrivate ? null : `${cdnBase}/${objectKey}`;

    return {
      objectKey,
      publicUrl,
      isPrivate: config.isPrivate,
      sizeBytes,
      mimeType,
      confirmedAt: new Date().toISOString()
    };
  }

  /**
   * Generates a short-lived (15-min) pre-signed GET URL for sensitive private documents.
   * Strictly verifies ownership or moderator/admin roles.
   */
  async generatePresignedGetUrl(
    requestingUserId: string,
    requestingUserRole: string,
    objectKey: string
  ): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
    if (!objectKey.startsWith('private/')) {
      throw new BadRequestError(
        'Private access URLs can only be requested for private storage documents.',
        ErrorCodes.BAD_REQUEST
      );
    }

    // Check ownership: private/{context}/{userId}/...
    const segments = objectKey.split('/');
    const ownerId = segments[2];

    const isOwner = ownerId === requestingUserId;
    const isStaff = requestingUserRole === 'moderator' || requestingUserRole === 'super_admin';

    if (!isOwner && !isStaff) {
      throw new ForbiddenError(
        'You are not authorized to view this private document.',
        ErrorCodes.FORBIDDEN
      );
    }

    const expiresInSeconds = 900; // 15 minutes
    let downloadUrl: string;

    if (this.isMock) {
      downloadUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${objectKey}?X-Amz-Expires=${expiresInSeconds}&mockGetSig=${crypto.randomUUID()}`;
    } else {
      const command = new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: objectKey
      });
      downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    }

    return {
      downloadUrl,
      expiresInSeconds
    };
  }

  /**
   * Deletes an object from S3. Used during orphan cleanup and ad deletion.
   */
  async deleteObject(objectKey: string): Promise<void> {
    if (this.isMock) {
      this.deleteMockObject(objectKey);
      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: objectKey
        })
      );
      logger.info(`Deleted storage object: ${objectKey}`);
    } catch (err: any) {
      logger.warn(`Failed to delete storage object ${objectKey}: ${err.message}`);
    }
  }

  /**
   * Fetches an object read stream from S3 for streaming public media.
   */
  async getObjectStream(objectKey: string): Promise<{ stream: any; contentType: string; contentLength?: number }> {
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: objectKey
    });
    const response = await this.s3Client.send(command);
    return {
      stream: response.Body,
      contentType: response.ContentType || 'image/jpeg',
      contentLength: response.ContentLength
    };
  }
}

export const s3StorageService = new S3StorageService();
