import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { KycStatus } from '@/lib/types/user.types';

export interface VerifyNidInput {
  nidNumber: string;
  dob: string;
  frontImageKey: string;
  backImageKey: string;
  liveSelfieKey: string;
  livenessMeta?: {
    blinkDetected?: boolean;
    headTurnDetected?: boolean;
    confidence?: number;
  };
}

export interface KycStatusResponse {
  kycStatus: KycStatus;
  isNidVerified: boolean;
  attemptsCount?: number;
  attemptsUsed?: number;
  submittedAt?: string;
  rejectionReason?: string | null;
  slaRemainingMinutes?: number;
}

export interface KycVerificationResult {
  status: KycStatus;
  message: string;
  isNidVerified: boolean;
}

export const kycApi = {
  getStatus: () =>
    apiClient.get<ApiSuccessResponse<KycStatusResponse>>('/kyc/status'),

  verifyNid: (data: VerifyNidInput) =>
    apiClient.post<ApiSuccessResponse<KycVerificationResult>>('/kyc/verify-nid', data),
};

