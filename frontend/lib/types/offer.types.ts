export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'countered'
  | 'expired';

export interface Offer {
  id: string;
  conversationId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  roundNumber: number; // 1, 2, or 3
  status: OfferStatus;
  offeredBy: 'buyer' | 'seller';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferInput {
  amount: number;
}

export interface CounterOfferInput {
  amount: number;
}

