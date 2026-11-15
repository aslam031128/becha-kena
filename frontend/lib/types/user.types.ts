export type UserRole = 'citizen' | 'moderator' | 'super_admin';

export type KycStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'retake_required'
  | 'manual_review';

export interface NotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  priceDropAlerts: boolean;
  chatMessages: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface User {
  id: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isNidVerified: boolean;
  kycStatus: KycStatus;
  isBanned: boolean;
  isFrozen: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  totalListings: number;
  activeDeviceCount: number;
  deviceUUIDs?: string[];
  notificationPreferences: NotificationPreferences;
  memberSince: string;
  createdAt?: string;
}

export interface PublicUserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isNidVerified: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  memberSince: string;
  trustBadges: Record<string, number>;
}

export interface DeviceSession {
  id: string;
  deviceUUID: string;
  deviceName: string;
  lastActive: string;
  isCurrent: boolean;
}

