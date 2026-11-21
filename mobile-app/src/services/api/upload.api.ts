import { apiClient } from './client';
import { ApiResponse } from '@/types/api.types';
import {
  PresignedUrlRequest,
  PresignedUrlResponse,
  ConfirmUploadRequest,
  ConfirmUploadResponse,
} from '@/types/kyc.types';

export const uploadApi = {
  /**
   * Request short-lived presigned PUT URL from backend.
   * Path: POST /api/v1/uploads/presigned-url
   */
  getPresignedUrl: async (
    params: PresignedUrlRequest
  ): Promise<ApiResponse<PresignedUrlResponse>> => {
    const response = await apiClient.post<ApiResponse<PresignedUrlResponse>>(
      '/uploads/presigned-url',
      params
    );
    return response.data;
  },

  /**
   * Stream file binary buffer directly to AWS S3 storage.
   */
  uploadToS3: async (
    uploadUrl: string,
    fileUri: string,
    mimeType: string = 'image/webp'
  ): Promise<void> => {
    // Read file as blob
    const fileResponse = await fetch(fileUri);
    const blob = await fileResponse.blob();

    const s3Response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!s3Response.ok) {
      throw new Error(`S3 direct upload failed with status ${s3Response.status}`);
    }
  },

  /**
   * Confirm uploaded object exists in storage via backend validation.
   * Path: POST /api/v1/uploads/confirm
   */
  confirmUpload: async (
    params: ConfirmUploadRequest
  ): Promise<ApiResponse<ConfirmUploadResponse>> => {
    const response = await apiClient.post<ApiResponse<ConfirmUploadResponse>>(
      '/uploads/confirm',
      params
    );
    return response.data;
  },

  /**
   * Complete composite direct-to-storage pipeline helper.
   */
  uploadFileToStorage: async (
    fileUri: string,
    context: PresignedUrlRequest['context'],
    fileName: string = 'document.webp',
    fileType: string = 'image/webp',
    fileSize: number = 200000
  ): Promise<{ objectKey: string; publicUrl: string }> => {
    // 1. Get presigned URL
    const presignRes = await uploadApi.getPresignedUrl({
      fileName,
      fileType,
      fileSize,
      context,
    });
    const { uploadUrl, objectKey } = presignRes.data;

    // 2. Direct PUT to S3
    await uploadApi.uploadToS3(uploadUrl, fileUri, fileType);

    // 3. Confirm with backend
    const confirmRes = await uploadApi.confirmUpload({
      objectKey,
      context,
    });

    return {
      objectKey: confirmRes.data.objectKey,
      publicUrl: confirmRes.data.publicUrl,
    };
  },
};
