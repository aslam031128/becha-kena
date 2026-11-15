import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';

export type UploadContext =
  | 'listing_image'
  | 'listing_video'
  | 'avatar'
  | 'nid_front'
  | 'nid_back'
  | 'gd_document';

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
}

export interface ConfirmUploadResponse {
  publicUrl: string;
  objectKey: string;
}

export interface GetPresignedUrlPayload {
  context: UploadContext;
  mimeType?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
}

export const uploadApi = {
  getPresignedUrl: (data: GetPresignedUrlPayload) => {
    const fileType = (data.fileType || data.mimeType || 'image/jpeg').toLowerCase();
    const ext = fileType.includes('png')
      ? '.png'
      : fileType.includes('webp')
      ? '.webp'
      : fileType.includes('mp4')
      ? '.mp4'
      : '.jpg';
    const fileName = data.fileName || `upload_${Date.now()}${ext}`;
    const fileSize = typeof data.fileSize === 'number' && data.fileSize > 0 ? data.fileSize : 1024 * 500;

    return apiClient.post<ApiSuccessResponse<PresignedUrlResponse>>('/uploads/presigned-url', {
      context: data.context,
      fileName,
      fileType,
      fileSize,
    });
  },

  confirmUpload: (objectKey: string, context?: UploadContext) =>
    apiClient.post<ApiSuccessResponse<ConfirmUploadResponse>>('/uploads/confirm', {
      objectKey,
      ...(context && { context }),
    }),

  getPrivateUrl: (key: string) =>
    apiClient.get<ApiSuccessResponse<{ downloadUrl: string }>>('/uploads/private-url', {
      params: { key },
    }),
};

