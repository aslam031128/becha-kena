import { BD_PHONE_REGEX } from '../constants/regex.js';

/**
 * Standardizes a Bangladeshi phone number to international E.164-like format (+8801XXXXXXXXX).
 *
 * Examples:
 *   "01712345678"     => "+8801712345678"
 *   "+8801712345678"  => "+8801712345678"
 *   "8801712345678"   => "+8801712345678"
 *   "01712-345678"    => "+8801712345678"
 */
export const normalizeBdPhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/[\s\-()]/g, '').trim();

  if (cleaned.startsWith('+8801')) {
    return cleaned;
  }
  if (cleaned.startsWith('8801')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('01')) {
    return `+88${cleaned}`;
  }
  return cleaned;
};

/**
 * Validates whether the given string represents a valid Bangladeshi mobile number.
 */
export const isValidBdPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const normalized = normalizeBdPhone(phone);
  return BD_PHONE_REGEX.test(normalized) || BD_PHONE_REGEX.test(phone.trim());
};
