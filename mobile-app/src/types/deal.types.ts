import { ConversationParticipant } from './chat.types';

export interface Deal {
  dealId: string;
  listing: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
  seller: ConversationParticipant;
  buyer: ConversationParticipant;
  finalPrice: number;
  isReviewedBySeller: boolean;
  isReviewedByBuyer: boolean;
  disputeStatus: 'none' | 'filed' | 'under_review' | 'resolved';
  disputeId?: string | null;
  completedAt: string;
}

export type ReviewTag =
  | 'punctual'
  | 'item_as_described'
  | 'friendly_communication'
  | 'quick_payment';

export interface Review {
  reviewId: string;
  dealId: string;
  rating: number;
  tags: ReviewTag[];
  comment?: string | null;
  reviewer: {
    id?: string;
    displayName: string;
    isNidVerified: boolean;
    avatarUrl?: string | null;
  };
  listingTitle?: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  dealId: string;
  rating: number;
  tags: ReviewTag[];
  comment?: string;
}

export interface Favorite {
  favoriteId: string;
  listing: {
    id: string;
    title: string;
    currentPrice: number;
    priceAtSave: number;
    isPriceDropped: boolean;
    priceDelta: number;
    status: string;
    thumbnailUrl?: string;
    sellerName: string;
  };
  createdAt?: string;
}

export type ReportReason =
  | 'scam_advance_demanded'
  | 'stolen_goods_suspected'
  | 'harassment'
  | 'counterfeit'
  | 'spam';

export interface Report {
  reportId: string;
  entityType: 'listing' | 'chat' | 'user';
  entityId: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'investigating' | 'actioned' | 'dismissed';
  createdAt: string;
  resolvedAt?: string | null;
}

export interface CreateReportRequest {
  entityType: 'listing' | 'chat' | 'user';
  entityId: string;
  reason: ReportReason;
  details?: string;
}

export interface Dispute {
  disputeId: string;
  dealId: string;
  gdNumber: string;
  thanaName: string;
  gdFilingDate: string;
  gdDocumentUrl?: string;
  status: 'pending' | 'verified' | 'rejected' | 'escalated_to_police';
  resolutionAction?: string | null;
  createdAt: string;
}

export interface FileDisputeRequest {
  gdNumber: string;
  thanaName: string;
  gdFilingDate: string;
  gdDocumentUrl: string;
}
