export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'countered'
  | 'declined'
  | 'expired';

export interface Offer {
  offerId: string;
  conversationId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: OfferStatus;
  round: number;
  parentOfferId?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface OfferResponse {
  offerId: string;
  status: OfferStatus;
  dealId?: string;
  finalPrice?: number;
  listingStatus?: string;
}

export interface SubmitOfferRequest {
  amount: number;
}

export interface CounterOfferRequest {
  amount: number;
}
