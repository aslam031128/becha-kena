export type ListingStatus =
  | 'draft'
  | 'active'
  | 'under_offer'
  | 'sold'
  | 'expired'
  | 'archived'
  | 'under_review';

export type ListingCondition =
  | 'brand_new'
  | 'like_new'
  | 'gently_used'
  | 'heavily_used';

export type ListingCategory =
  | 'electronics'
  | 'vehicles'
  | 'property'
  | 'fashion'
  | 'home'
  | 'hobbies';

export interface ListingLocation {
  division: string;
  thana: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface SellerSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isNidVerified: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  memberSince: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  category: ListingCategory;
  imageUrls: string[];
  videoUrl: string | null;
  location?: ListingLocation;
  status: ListingStatus;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  viewCount: number;
  inquiryCount: number;
  renewCount: number;
  maxRenewals: number;
  expiresAt: string;
  isPhoneHidden: boolean;
  sellerId: string;
  seller: SellerSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ListingSearchParams {
  q?: string;
  category?: ListingCategory;
  condition?: ListingCondition;
  division?: string;
  thana?: string;
  longitude?: number;
  latitude?: number;
  maxDistanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_low' | 'price_high' | 'distance';
  page?: number;
  limit?: number;
  status?: ListingStatus;
  sellerId?: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  category: ListingCategory;
  condition: ListingCondition;
  location: ListingLocation;
  imageUrls: string[];
  videoUrl?: string | null;
  isPhoneHidden?: boolean;
}

