/**
 * Privacy-preserving masking utility.
 */

/**
 * Masks a legal citizen name: e.g. "FARHANA RAHMAN" -> "F****** R*****"
 */
export const maskLegalName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      return part[0] + '*'.repeat(part.length - 1);
    })
    .join(' ');
};

/**
 * Masks a phone number: e.g. "+8801712345678" -> "+88017****5678"
 */
export const maskPhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.length < 8) return trimmed;
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}****${suffix}`;
};
