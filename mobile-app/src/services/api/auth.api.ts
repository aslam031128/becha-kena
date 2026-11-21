import { apiClient } from './client';
import { ApiResponse } from '@/types/api.types';
import {
  LoginResponse,
  OtpResponse,
  RefreshResponse,
  User,
  VerifyOtpRequest,
} from '@/types/user.types';
import { getOrCreateDeviceUUID, getRefreshToken } from '@/utils/storage';
import * as Device from 'expo-device';

export const authApi = {
  /**
   * Request a 6-digit SMS OTP to a Bangladeshi mobile number.
   * Path: POST /api/v1/auth/request-otp
   */
  requestOtp: async (phone: string): Promise<ApiResponse<OtpResponse>> => {
    const response = await apiClient.post<ApiResponse<OtpResponse>>('/auth/request-otp', {
      phone: phone.trim(),
    });
    return response.data;
  },

  /**
   * Validate the OTP, register or login citizen profile, and receive session JWT.
   * Path: POST /api/v1/auth/verify-otp
   */
  verifyOtp: async (params: VerifyOtpRequest): Promise<ApiResponse<LoginResponse>> => {
    const deviceUUID = params.deviceUUID || (await getOrCreateDeviceUUID());
    const deviceName =
      params.deviceName ||
      `${Device.brand || 'Device'} ${Device.modelName || 'Smartphone'}`.trim();

    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/verify-otp', {
      phone: params.phone.trim(),
      otp: params.otp.trim(),
      deviceUUID,
      deviceName,
    });
    return response.data;
  },

  /**
   * Exchange the long-lived refresh token for a fresh 15-minute access token.
   * Path: POST /api/v1/auth/refresh-token
   */
  refreshToken: async (token?: string): Promise<ApiResponse<RefreshResponse>> => {
    const refreshToken = token || (await getRefreshToken());
    const response = await apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh-token', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Terminate active session in Redis and clear session cookies.
   * Path: POST /api/v1/auth/logout
   */
  logout: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },

  /**
   * Fetch current authenticated citizen profile and KYC status.
   * Path: GET /api/v1/users/me
   */
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>('/users/me');
    return response.data;
  },
};
