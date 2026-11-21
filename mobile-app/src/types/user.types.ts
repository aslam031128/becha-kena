export type UserRole = 'citizen' | 'moderator' | 'super_admin';

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'retake_required' | 'manual_review';

export interface NotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  priceDropAlerts: boolean;
  quietHoursStart: string; // e.g. "23:00"
  quietHoursEnd: string;   // e.g. "07:00"
}

export interface TrustBadgesSummary {
  item_as_described?: number;
  punctual?: number;
  friendly_communication?: number;
  quick_payment?: number;
}

export interface User {
  id: string;
  phone: string;
  displayName: string;
  role: UserRole;
  isNidVerified: boolean;
  kycStatus: KycStatus;
  kycAttempts?: number;
  avatarUrl: string | null;
  activeDeviceCount: number;
  deviceUUIDs?: string[];
  isBanned: boolean;
  isFrozen: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  notificationPreferences?: NotificationPreferences;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  isNidVerified: boolean;
  avatarUrl: string | null;
  averageRating: number;
  totalDealsCompleted: number;
  memberSince: string;
  trustBadges: TrustBadgesSummary;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
  isNewUser: boolean;
  isNewDeviceChallengeRequired?: boolean;
}

export interface OtpResponse {
  phone: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  deviceUUID?: string;
  deviceName?: string;
}

export interface RequestOtpRequest {
  phone: string;
}
