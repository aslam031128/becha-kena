import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { Review, CreateReviewInput } from '@/lib/types/deal.types';

export const reviewApi = {
  createReview: (data: CreateReviewInput) =>
    apiClient.post<ApiSuccessResponse<Review>>('/reviews', data),

  getReviewsByDeal: (dealId: string) =>
    apiClient.get<ApiSuccessResponse<Review[]>>(`/reviews/deal/${dealId}`),
};

