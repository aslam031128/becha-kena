import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { User, PublicUserProfile, NotificationPreferences, DeviceSession } from '@/lib/types/user.types';
import { Review } from '@/lib/types/deal.types';

export const userApi = {
  getMyProfile: () =>
    apiClient.get<ApiSuccessResponse<User>>('/users/me'),

  getPublicProfile: (userId: string) =>
    apiClient.get<ApiSuccessResponse<PublicUserProfile>>(`/users/${userId}/public-profile`),

  getUserReviews: (userId: string) =>
    apiClient.get<ApiSuccessResponse<Review[]>>(`/users/${userId}/reviews`),

  updateProfile: (data: Partial<Pick<User, 'displayName' | 'avatarUrl'>>) =>
    apiClient.patch<ApiSuccessResponse<User>>('/users/me/profile', data),

  updateNotificationPreferences: (data: Partial<NotificationPreferences>) =>
    apiClient.patch<ApiSuccessResponse<NotificationPreferences>>('/users/me/notification-preferences', data),

  getActiveDevices: () =>
    apiClient.get<ApiSuccessResponse<DeviceSession[]>>('/users/me/devices'),

  terminateDevice: (deviceId: string) =>
    apiClient.delete<ApiSuccessResponse<{ message: string }>>(`/users/me/devices/${deviceId}`),
};

