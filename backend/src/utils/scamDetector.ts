/**
 * Utility functions for in-flight scam pattern detection and link stripping
 * in C2C real-time chat.
 */

export const SCAM_REGEX = /(advance|bkash|nagad|rocket|courier\s*charge|delivery\s*charge|booking\s*fee|send\s*money\s*first|অগ্রিম|বিকাশ|নগদ)/i;

export const SCAM_WARNING_MESSAGE = 'Warning: Never send advance money via bKash/Nagad before physically verifying the product.';

/**
 * Detects if a message text contains known advance payment fraud patterns.
 */
export const detectScamPatterns = (text: string): boolean => {
  if (!text) return false;
  return SCAM_REGEX.test(text);
};

/**
 * Strips external URLs (http://, https://) and harmful file patterns (.apk)
 * to neutralize phishing links and fake courier tracking websites.
 */
export const stripExternalLinks = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/(?:^|\s)[^\s]+\.apk(?:\s|$)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

