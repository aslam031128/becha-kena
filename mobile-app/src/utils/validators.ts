import { BD_PHONE_REGEX, NID_REGEX, OTP_REGEX, MIN_PRICE_BDT, MAX_PRICE_BDT } from './constants';

export function isValidBdPhone(phone: string): boolean {
  if (!phone) return false;
  return BD_PHONE_REGEX.test(phone.trim());
}

export function isValidNid(nid: string): boolean {
  if (!nid) return false;
  return NID_REGEX.test(nid.trim());
}

export function isValidOtp(otp: string): boolean {
  if (!otp) return false;
  return OTP_REGEX.test(otp.trim());
}

export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && !isNaN(price) && price >= MIN_PRICE_BDT && price <= MAX_PRICE_BDT;
}

export function isValidListingTitle(title: string): boolean {
  if (!title) return false;
  const len = title.trim().length;
  return len >= 10 && len <= 100;
}

export function isValidListingDescription(desc: string): boolean {
  if (!desc) return false;
  const len = desc.trim().length;
  return len >= 20 && len <= 2000;
}
