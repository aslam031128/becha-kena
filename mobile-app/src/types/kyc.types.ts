import { KycStatus } from './user.types';

export interface OcrResult {
  nidNumber: string;
  dob: string;
  extractedName: string;
  format: 'smart_card_10' | 'legacy_13_17';
}

export interface LivenessMeta {
  blinkDetected: boolean;
  headTurnDetected: boolean;
  confidence: number;
}

export interface VerifyNidRequest {
  nidNumber: string;
  dob: string; // ISO YYYY-MM-DD
  frontImageKey: string;
  backImageKey: string;
  liveSelfieKey: string;
  livenessMeta: LivenessMeta;
}

export interface KycVerifyResult {
  isNidVerified: boolean;
  kycStatus: KycStatus;
  maskedLegalName: string;
  verifiedAt: string;
}

export interface KycStatusResponse {
  kycStatus: KycStatus;
  isNidVerified: boolean;
  attemptsUsed: number;
  submittedAt: string;
  slaRemainingMinutes: number;
  slaWorkingHours?: string;
  rejectionReason?: string;
}

export interface RebindPhoneRequest {
  newPhone: string;
  phoneOtp: string;
  nidNumber: string;
  dob: string;
  liveSelfieKey: string;
}

export interface RebindPhoneResponse {
  newPhone: string;
  accessToken: string;
}

export interface NewDeviceRequest {
  deviceUUID: string;
  deviceName: string;
  liveSelfieKey: string;
}

export interface NewDeviceResponse {
  activeDeviceCount: number;
  accessToken: string;
}

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  context:
    | 'listing_image'
    | 'listing_video'
    | 'avatar'
    | 'nid_front'
    | 'nid_back'
    | 'gd_document';
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  isPrivate: boolean;
  expiresInSeconds: number;
  method: 'PUT';
}

export interface ConfirmUploadRequest {
  objectKey: string;
  context: string;
}

export interface ConfirmUploadResponse {
  objectKey: string;
  publicUrl: string;
  isPrivate: boolean;
  sizeBytes: number;
  mimeType: string;
  confirmedAt: string;
}
