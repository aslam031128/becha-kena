/**
 * Resolves media URLs for public listings, avatars, and assets.
 * Pure deterministic function across both SSR and client to prevent React hydration mismatch.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '/images/placeholder.webp';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // If URL points to placeholder cdn.becha-kena.com, rewrite to deterministic local proxy path
  if (url.includes('cdn.becha-kena.com')) {
    const objectKey = url.split('cdn.becha-kena.com/')[1];
    return `/api/v1/uploads/file/${objectKey}`;
  }

  // If URL contains absolute port 5000 API uploads URL, normalize to relative path
  if (url.includes('/api/v1/uploads/file/')) {
    const objectKey = url.split('/api/v1/uploads/file/')[1];
    return `/api/v1/uploads/file/${objectKey}`;
  }

  return url;
}
