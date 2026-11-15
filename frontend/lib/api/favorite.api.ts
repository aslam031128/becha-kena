import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { Listing } from '@/lib/types/listing.types';

export interface FavoriteItem {
  id: string;
  listingId: string;
  listing: Listing;
  priceAtSave: number;
  isPriceDropped: boolean;
  createdAt: string;
}

export const favoriteApi = {
  getFavorites: () =>
    apiClient.get<ApiSuccessResponse<FavoriteItem[]>>('/favorites'),

  addFavorite: (listingId: string) =>
    apiClient.post<ApiSuccessResponse<{ message: string; isFavorited: boolean }>>(
      `/favorites/${listingId}`
    ),

  removeFavorite: (listingId: string) =>
    apiClient.delete<ApiSuccessResponse<{ message: string }>>(`/favorites/${listingId}`),
};

