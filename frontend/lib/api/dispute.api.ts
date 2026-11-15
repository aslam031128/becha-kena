import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { Dispute, CreateDisputeInput } from '@/lib/types/deal.types';

export const disputeApi = {
  createDispute: (dealId: string, data: CreateDisputeInput) =>
    apiClient.post<ApiSuccessResponse<Dispute>>(`/deals/${dealId}/disputes`, data),

  getDisputeByDeal: (dealId: string) =>
    apiClient.get<ApiSuccessResponse<Dispute>>(`/deals/${dealId}/disputes`),
};

