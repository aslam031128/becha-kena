import React from 'react';
import { Listing } from '@/lib/types/listing.types';
import { HomeContent } from '@/components/home/home-content';

async function getRecentListings(): Promise<Listing[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/listings?sort=newest&limit=8`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

async function getPopularListings(): Promise<Listing[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/listings?sort=price_high&limit=8`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [recentListings, popularListings] = await Promise.all([
    getRecentListings(),
    getPopularListings(),
  ]);

  return (
    <HomeContent
      recentListings={recentListings}
      popularListings={popularListings}
    />
  );
}
