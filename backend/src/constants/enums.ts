export enum UserRole {
  CITIZEN = 'citizen',
  MODERATOR = 'moderator',
  SUPER_ADMIN = 'super_admin'
}

export enum KycStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  RETAKE_REQUIRED = 'retake_required',
  MANUAL_REVIEW = 'manual_review'
}

export enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  UNDER_OFFER = 'under_offer',
  SOLD = 'sold',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
  UNDER_REVIEW = 'under_review'
}

export enum ListingCondition {
  BRAND_NEW = 'brand_new',
  LIKE_NEW = 'like_new',
  GENTLY_USED = 'gently_used',
  HEAVILY_USED = 'heavily_used'
}

export enum ListingCategory {
  ELECTRONICS = 'electronics',
  VEHICLES = 'vehicles',
  PROPERTY = 'property',
  FASHION = 'fashion',
  HOME = 'home',
  HOBBIES = 'hobbies'
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  FLAGGED = 'flagged',
  REJECTED = 'rejected'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SYSTEM = 'system',
  OFFER_EVENT = 'offer_event'
}

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  COUNTERED = 'countered',
  DECLINED = 'declined',
  EXPIRED = 'expired'
}

export enum DealStatus {
  PENDING_MEETUP = 'pending_meetup',
  BUYER_CONFIRMED = 'buyer_confirmed',
  SELLER_CONFIRMED = 'seller_confirmed',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled'
}

export enum DisputeStatus {
  NONE = 'none',
  FILED = 'filed',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved'
}

export enum DisputeResolution {
  SELLER_BANNED = 'seller_banned',
  CLAIM_DISMISSED = 'claim_dismissed',
  LEGAL_HOLD = 'legal_hold'
}

export enum ReportEntityType {
  LISTING = 'listing',
  CHAT = 'chat',
  USER = 'user'
}

export enum ReportReason {
  SCAM_ADVANCE_DEMANDED = 'scam_advance_demanded',
  STOLEN_GOODS_SUSPECTED = 'stolen_goods_suspected',
  HARASSMENT = 'harassment',
  COUNTERFEIT = 'counterfeit',
  SPAM = 'spam'
}

export enum ReportStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  ACTIONED = 'actioned',
  DISMISSED = 'dismissed'
}

export enum KycProviderType {
  PORICHOY = 'porichoy',
  SHADHIN = 'shadhin',
  MOCK = 'mock'
}

export enum ReviewTag {
  PUNCTUAL = 'punctual',
  ITEM_AS_DESCRIBED = 'item_as_described',
  FRIENDLY_COMMUNICATION = 'friendly_communication',
  QUICK_PAYMENT = 'quick_payment'
}
