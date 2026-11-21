export type ListingStatus =
  | 'draft'
  | 'active'
  | 'under_offer'
  | 'sold'
  | 'expired'
  | 'archived'
  | 'under_review';

export type ListingModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export type ListingCondition = 'brand_new' | 'like_new' | 'gently_used' | 'heavily_used';

export type ListingCategory =
  | 'electronics'
  | 'vehicles'
  | 'property'
  | 'fashion'
  | 'home'
  | 'hobbies';

export interface ListingLocation {
  type?: 'Point';
  coordinates?: [number, number]; // [longitude, latitude]
  division: string;
  thana: string;
}

export interface SellerSummary {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  isNidVerified: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  memberSince?: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  category: ListingCategory;
  location: ListingLocation;
  thumbnailUrl?: string;
  imageUrls: string[];
  status: ListingStatus;
  moderationStatus?: ListingModerationStatus;
  isPhoneHidden: boolean;
  soldToBuyerId?: string | null;
  viewCount: number;
  inquiryCount: number;
  renewCount: number;
  maxRenewals: number;
  distanceKm?: number;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
  seller: SellerSummary;
}

export interface ListingSearchParams {
  q?: string;
  category?: ListingCategory | string;
  division?: string;
  thana?: string;
  longitude?: number;
  latitude?: number;
  maxDistanceKm?: number;
  condition?: ListingCondition | string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_low' | 'price_high' | 'distance';
  page?: number;
  limit?: number;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  category: ListingCategory;
  location: ListingLocation;
  imageUrls: string[];
  isPhoneHidden?: boolean;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  condition?: ListingCondition;
  category?: ListingCategory;
  location?: ListingLocation;
  imageUrls?: string[];
  isPhoneHidden?: boolean;
}

export interface PhoneRevealResponse {
  listingId: string;
  sellerPhone: string;
  revealsUsedToday: number;
  revealsRemainingToday: number;
}
