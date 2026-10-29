import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Computes an HMAC-SHA256 hash of a National ID number using the HMAC_SALT.
 * Produces a deterministic 64-character lowercase hex string suitable for
 * zero-knowledge collision detection without storing plaintext NID.
 *
 * @param nidNumber The citizen's National ID number string.
 * @returns 64-character hexadecimal HMAC-SHA256 string.
 */
export const computeNidHash = (nidNumber: string): string => {
  if (!nidNumber || typeof nidNumber !== 'string' || nidNumber.trim().length === 0) {
    throw new Error('NID number must be a non-empty string');
  }

  return crypto
    .createHmac('sha256', env.HMAC_SALT)
    .update(nidNumber.trim())
    .digest('hex');
};
