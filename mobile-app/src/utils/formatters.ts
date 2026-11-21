export function formatCurrencyBDT(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'BDT 0';
  }
  return `BDT ${amount.toLocaleString('en-US')}`;
}

export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null) return '';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export function formatRelativeDate(isoDate: string): string {
  try {
    const now = new Date();
    const date = new Date(isoDate);
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    // 01712 345678 -> +880 1712-345678
    return `+880 ${cleaned.slice(1, 5)}-${cleaned.slice(5)}`;
  }
  return phone;
}
