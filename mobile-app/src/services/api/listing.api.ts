import { apiClient } from './client';
import { ApiResponse } from '@/types/api.types';
import {
  Listing,
  ListingSearchParams,
  CreateListingRequest,
  UpdateListingRequest,
  PhoneRevealResponse,
} from '@/types/listing.types';

export const listingApi = {
  searchListings: async (params?: ListingSearchParams): Promise<ApiResponse<Listing[]>> => {
    const response = await apiClient.get<ApiResponse<Listing[]>>('/listings', {
      params,
    });
    return response.data;
  },

  getListingById: async (id: string): Promise<ApiResponse<Listing>> => {
    const response = await apiClient.get<ApiResponse<Listing>>(`/listings/${id}`);
    return response.data;
  },

  createListing: async (data: CreateListingRequest): Promise<ApiResponse<Listing>> => {
    const response = await apiClient.post<ApiResponse<Listing>>('/listings', data);
    return response.data;
  },

  updateListing: async (id: string, data: UpdateListingRequest): Promise<ApiResponse<Listing>> => {
    const response = await apiClient.put<ApiResponse<Listing>>(`/listings/${id}`, data);
    return response.data;
  },

  deleteListing: async (id: string): Promise<ApiResponse<{ id: string; status: string; deletedAt?: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string; status: string; deletedAt?: string }>>(`/listings/${id}`);
    return response.data;
  },

  updateListingStatus: async (
    id: string,
    status: 'active' | 'under_offer'
  ): Promise<ApiResponse<Listing>> => {
    const response = await apiClient.patch<ApiResponse<Listing>>(`/listings/${id}/status`, {
      status,
    });
    return response.data;
  },

  renewListing: async (
    id: string
  ): Promise<ApiResponse<{ id: string; renewCount: number; maxRenewals: number; expiresAt: string }>> => {
    const response = await apiClient.post<ApiResponse<{ id: string; renewCount: number; maxRenewals: number; expiresAt: string }>>(
      `/listings/${id}/renew`
    );
    return response.data;
  },

  revealSellerPhone: async (listingId: string): Promise<ApiResponse<PhoneRevealResponse>> => {
    const response = await apiClient.post<ApiResponse<PhoneRevealResponse>>(
      `/listings/${listingId}/reveal-phone`
    );
    return response.data;
  },

  getMyListings: async (params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<Listing[]>> => {
    const response = await apiClient.get<ApiResponse<Listing[]>>('/listings/my-listings', {
      params,
    });
    return response.data;
  },
};
