export type DealStatus = 'completed' | 'disputed' | 'cancelled';
export type DisputeStatus = 'none' | 'pending' | 'under_review' | 'resolved' | 'dismissed';

export type TrustBadge =
  | 'punctual'
  | 'item_as_described'
  | 'friendly_communication'
  | 'quick_payment';

export interface Deal {
  id: string;
  dealReceiptNumber: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl: string;
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  buyerId: string;
  buyerName: string;
  buyerVerified: boolean;
  finalPrice: number;
  status: DealStatus;
  disputeStatus: DisputeStatus;
  sellerReviewed: boolean;
  buyerReviewed: boolean;
  reviewWindowExpiresAt: string;
  completedAt: string;
}

export interface Review {
  id: string;
  dealId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string | null;
  revieweeId: string;
  rating: number; // 1-5
  tags: TrustBadge[];
  comment?: string | null;
  createdAt: string;
}

export interface CreateReviewInput {
  dealId: string;
  rating: number;
  tags: TrustBadge[];
  comment?: string;
}

export interface Dispute {
  id: string;
  dealId: string;
  complainantId: string;
  gdNumber: string;
  thana: string;
  filingDate: string;
  gdDocumentKey: string;
  gdDocumentUrl?: string;
  status: 'pending' | 'investigating' | 'seller_banned' | 'claim_dismissed' | 'legal_hold';
  resolutionNotes?: string;
  createdAt: string;
}

export interface CreateDisputeInput {
  gdNumber: string;
  thana: string;
  filingDate: string;
  gdDocumentKey: string;
}

