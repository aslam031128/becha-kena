import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { Offer, CreateOfferInput, CounterOfferInput } from '@/lib/types/offer.types';

export const offerApi = {
  getOffers: (conversationId: string) =>
    apiClient.get<ApiSuccessResponse<Offer[]>>(`/chats/${conversationId}/offers`),

  makeOffer: (conversationId: string, data: CreateOfferInput) =>
    apiClient.post<ApiSuccessResponse<Offer>>(`/chats/${conversationId}/offers`, data),

  counterOffer: (conversationId: string, offerId: string, data: CounterOfferInput) =>
    apiClient.post<ApiSuccessResponse<Offer>>(
      `/chats/${conversationId}/offers/${offerId}/counter`,
      data
    ),

  acceptOffer: (conversationId: string, offerId: string) =>
    apiClient.post<ApiSuccessResponse<Offer>>(
      `/chats/${conversationId}/offers/${offerId}/accept`
    ),

  declineOffer: (conversationId: string, offerId: string) =>
    apiClient.post<ApiSuccessResponse<Offer>>(
      `/chats/${conversationId}/offers/${offerId}/decline`
    ),
};

