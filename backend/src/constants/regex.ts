/**
 * Bangladeshi phone number regex:
 * Accepts:
 *   - +8801[3-9]\d{8} (e.g. +8801712345678)
 *   - 01[3-9]\d{8} (e.g. 01712345678)
 */
export const BD_PHONE_REGEX = /^(?:\+8801|01)[3-9]\d{8}$/;

/**
 * Standard Bangladeshi NID formats:
 * - Old format: 13 digits or 17 digits (year of birth prefixed)
 * - Smart NID: 10 digits
 */
export const BD_NID_REGEX = /^(?:\d{10}|\d{13}|\d{17})$/;

/**
 * MongoDB 24-character hex ObjectId regex
 */
export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
