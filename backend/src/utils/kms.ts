import crypto from 'crypto';
import { env } from '../config/env.js';

export interface EncryptedDataResult {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypts an arbitrary object using AES-256-GCM with KMS_SECRET_KEY and a random 12-byte IV.
 * Produces an envelope containing the ciphertext, initialization vector, and authentication tag.
 *
 * @param plaintext Object containing legal/demographic data to encrypt.
 * @returns {EncryptedDataResult} Containing hex-encoded ciphertext, iv, and authTag.
 */
export const encryptData = (plaintext: object): EncryptedDataResult => {
  if (!plaintext || typeof plaintext !== 'object') {
    throw new Error('Plaintext data must be a valid non-null object');
  }

  // KMS_SECRET_KEY is a 64-character hex string (32 bytes = 256 bits)
  const key = Buffer.from(env.KMS_SECRET_KEY, 'hex');
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const jsonString = JSON.stringify(plaintext);
  const encrypted = Buffer.concat([cipher.update(jsonString, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

/**
 * Decrypts AES-256-GCM ciphertext using KMS_SECRET_KEY, IV, and authentication tag.
 * Verifies authenticity tag before parsing and returning the decrypted object.
 *
 * @param ciphertext Hex-encoded encrypted data.
 * @param iv Hex-encoded 12-byte initialization vector.
 * @param authTag Hex-encoded 16-byte GCM authentication tag.
 * @returns Parsed JavaScript object.
 */
export const decryptData = (ciphertext: string, iv: string, authTag: string): object => {
  if (!ciphertext || !iv || !authTag) {
    throw new Error('Ciphertext, IV, and authTag are mandatory for decryption');
  }

  const key = Buffer.from(env.KMS_SECRET_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString('utf8'));
};
