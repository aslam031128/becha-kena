import { Platform } from 'react-native';

// In development, Android emulator connects to host via 10.0.2.2, while iOS simulator/web uses localhost
const DEV_API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api/v1'
    : 'http://localhost:5000/api/v1';

const DEV_SOCKET_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000'
    : 'http://localhost:5000';

export const API_BASE_URL = __DEV__
  ? DEV_API_URL
  : 'https://api.becha-kena.com/api/v1';

export const SOCKET_URL = __DEV__
  ? DEV_SOCKET_URL
  : 'https://api.becha-kena.com';

// Bangladeshi mobile validation: +8801[3-9]XXXXXXXX or 01[3-9]XXXXXXXX (11 digits local)
export const BD_PHONE_REGEX = /^(?:\+8801|01)[3-9]\d{8}$/;

// National ID: 10-digit Smart Card OR 13/17-digit classic NID
export const NID_REGEX = /^(?:\d{10}|\d{13}|\d{17})$/;

// 6-digit verification OTP
export const OTP_REGEX = /^\d{6}$/;

// Marketplace Business Rules
export const MAX_ACTIVE_LISTINGS_PER_MONTH = 5;
export const MAX_REVEALS_PER_DAY = 10;
export const MAX_OFFERS_PER_LISTING = 3;
export const MIN_PRICE_BDT = 50;
export const MAX_PRICE_BDT = 2500000;
export const OFFER_EXPIRY_HOURS = 24;
export const LISTING_LIFECYCLE_DAYS = 30;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'bk_access_token',
  REFRESH_TOKEN: 'bk_refresh_token',
  DEVICE_UUID: 'bk_device_uuid',
  USER_PROFILE: 'bk_user_profile',
} as const;
