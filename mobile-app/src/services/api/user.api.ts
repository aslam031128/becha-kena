import { apiClient } from './client';
import { ApiResponse } from '@/types/api.types';
import { PublicProfile, NotificationPreferences } from '@/types/user.types';
import { Review } from '@/types/deal.types';

export const userApi = {
  getPublicProfile: async (userId: string): Promise<ApiResponse<PublicProfile>> => {
    const response = await apiClient.get<ApiResponse<PublicProfile>>(
      `/users/${userId}/public-profile`
    );
    return response.data;
  },

  getUserReviews: async (
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<Review[]>> => {
    const response = await apiClient.get<ApiResponse<Review[]>>(
      `/users/${userId}/reviews`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  updateNotificationPreferences: async (
    prefs: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> => {
    const response = await apiClient.patch<ApiResponse<NotificationPreferences>>(
      '/users/me/notification-preferences',
      prefs
    );
    return response.data;
  },
};
