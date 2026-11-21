import { apiClient } from './client';
import { ApiResponse } from '@/types/api.types';
import {
  OcrResult,
  VerifyNidRequest,
  KycVerifyResult,
  KycStatusResponse,
  RebindPhoneRequest,
  RebindPhoneResponse,
  NewDeviceRequest,
  NewDeviceResponse,
} from '@/types/kyc.types';

export const kycApi = {
  /**
   * Optical Character Recognition (OCR) extraction on uploaded NID front and back cards.
   * Path: POST /api/v1/kyc/ocr (Multipart/form-data)
   */
  ocrExtract: async (
    frontImageUri: string,
    backImageUri: string
  ): Promise<ApiResponse<OcrResult>> => {
    const formData = new FormData();

    const frontFile = {
      uri: frontImageUri,
      name: 'nid_front.jpg',
      type: 'image/jpeg',
    } as any;

    const backFile = {
      uri: backImageUri,
      name: 'nid_back.jpg',
      type: 'image/jpeg',
    } as any;

    formData.append('frontImage', frontFile);
    formData.append('backImage', backFile);

    const response = await apiClient.post<ApiResponse<OcrResult>>('/kyc/ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Composite Fast KYC Pipeline: Zero-knowledge NID verification,
   * Porichoy demographic lookup, and real-time biometric liveness match.
   * Path: POST /api/v1/kyc/verify-nid
   */
  verifyNid: async (
    payload: VerifyNidRequest
  ): Promise<ApiResponse<KycVerifyResult>> => {
    const response = await apiClient.post<ApiResponse<KycVerifyResult>>(
      '/kyc/verify-nid',
      payload
    );
    return response.data;
  },

  /**
   * Query citizen's current verification lifecycle state and manual review SLA.
   * Path: GET /api/v1/kyc/status
   */
  getKycStatus: async (): Promise<ApiResponse<KycStatusResponse>> => {
    const response = await apiClient.get<ApiResponse<KycStatusResponse>>('/kyc/status');
    return response.data;
  },

  /**
   * Lost SIM Recovery: Rebind verified citizen account to a new mobile number
   * using NID + biometric liveness match.
   * Path: POST /api/v1/kyc/rebind-phone
   */
  rebindPhone: async (
    payload: RebindPhoneRequest
  ): Promise<ApiResponse<RebindPhoneResponse>> => {
    const response = await apiClient.post<ApiResponse<RebindPhoneResponse>>(
      '/kyc/rebind-phone',
      payload
    );
    return response.data;
  },

  /**
   * "New Phone, Same SIM" device authorization via fast selfie liveness challenge.
   * Path: POST /api/v1/kyc/verify-new-device
   */
  verifyNewDevice: async (
    payload: NewDeviceRequest
  ): Promise<ApiResponse<NewDeviceResponse>> => {
    const response = await apiClient.post<ApiResponse<NewDeviceResponse>>(
      '/kyc/verify-new-device',
      payload
    );
    return response.data;
  },
};
