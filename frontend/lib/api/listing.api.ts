import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { Listing, ListingSearchParams, CreateListingInput } from '@/lib/types/listing.types';

export const listingApi = {
  getListings: (params?: ListingSearchParams) =>
    apiClient.get<ApiSuccessResponse<Listing[]>>('/listings', { params }),

  getMyListings: (status?: string) =>
    apiClient.get<ApiSuccessResponse<Listing[]>>('/listings/my-listings', {
      params: status ? { status } : undefined,
    }),

  getListingById: (id: string) =>
    apiClient.get<ApiSuccessResponse<Listing>>(`/listings/${id}`),

  createListing: (data: CreateListingInput) =>
    apiClient.post<ApiSuccessResponse<Listing>>('/listings', data),

  updateListing: (id: string, data: Partial<CreateListingInput>) =>
    apiClient.put<ApiSuccessResponse<Listing>>(`/listings/${id}`, data),

  deleteListing: (id: string) =>
    apiClient.delete<ApiSuccessResponse<{ message: string }>>(`/listings/${id}`),

  renewListing: (id: string) =>
    apiClient.post<ApiSuccessResponse<Listing>>(`/listings/${id}/renew`),

  revealPhone: (id: string) =>
    apiClient.post<
      ApiSuccessResponse<{
        phone?: string;
        sellerPhone?: string;
        revealsRemainingToday: number;
        revealsUsedToday?: number;
      }>
    >(`/listings/${id}/reveal-phone`),
};

