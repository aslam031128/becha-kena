import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { Deal } from '@/lib/types/deal.types';

export const dealApi = {
  getDeals: () =>
    apiClient.get<ApiSuccessResponse<Deal[]>>('/deals'),

  getDealById: (dealId: string) =>
    apiClient.get<ApiSuccessResponse<Deal>>(`/deals/${dealId}`),

  directSale: (data: { listingId: string; buyerId: string; finalPrice: number }) =>
    apiClient.post<ApiSuccessResponse<Deal>>('/deals/direct-sale', data),
};

