import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { User } from '@/lib/types/user.types';

export interface RequestOtpResponse {
  phone: string;
  expiresInSeconds: number;
}

export interface VerifyOtpResponse {
  accessToken: string;
  user: User;
  isNewUser: boolean;
}

export const authApi = {
  requestOtp: (phone: string) =>
    apiClient.post<ApiSuccessResponse<RequestOtpResponse>>('/auth/request-otp', { phone }),

  verifyOtp: (data: { phone: string; otp: string; deviceUUID: string; deviceName: string }) =>
    apiClient.post<ApiSuccessResponse<VerifyOtpResponse>>('/auth/verify-otp', data),

  refreshToken: () =>
    apiClient.post<ApiSuccessResponse<{ accessToken: string }>>('/auth/refresh-token'),

  logout: () =>
    apiClient.post<ApiSuccessResponse<{ message: string }>>('/auth/logout'),

  getProfile: () =>
    apiClient.get<ApiSuccessResponse<User>>('/auth/me'),
};

