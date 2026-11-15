import React from 'react';
import { notFound } from 'next/navigation';
import { ShieldCheck, Star, Award, Calendar, Package } from 'lucide-react';
import { PublicUserProfile } from '@/lib/types/user.types';
import { Review } from '@/lib/types/deal.types';
import { Listing } from '@/lib/types/listing.types';
import { ListingCard } from '@/components/listing/listing-card';
import { ReportUserButton } from '@/components/user/report-user-button';
import { PersonJsonLd } from '@/components/shared/json-ld';

interface UserProfilePageProps {
  params: Promise<{ id: string }>;
}

async function fetchUserProfile(userId: string): Promise<PublicUserProfile | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/users/${userId}/public-profile`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

async function fetchUserReviews(userId: string): Promise<Review[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/users/${userId}/reviews`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

async function fetchUserListings(userId: string): Promise<Listing[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/listings?sellerId=${userId}`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export default async function PublicUserProfilePage({ params }: UserProfilePageProps) {
  const { id } = await params;
  const [profile, reviews, listings] = await Promise.all([
    fetchUserProfile(id),
    fetchUserReviews(id),
    fetchUserListings(id),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PersonJsonLd profile={profile} />
      {/* Top Profile Summary Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-3xl border-2 border-emerald-300">
          {profile.displayName?.charAt(0).toUpperCase() || 'U'}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {profile.displayName}
            </h1>
            {profile.isNidVerified && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>NID ভেরিফাইড নাগরিক</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <strong className="text-slate-800 font-bold">
                {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : 'New'}
              </strong>
              <span>({reviews.length} reviews)</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4 text-slate-400" />
              <span>{profile.totalDealsCompleted} Deals Completed</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Member since {new Date(profile.memberSince).toLocaleDateString()}</span>
            </span>
          </div>

          {/* Trust Badges Aggregation */}
          {profile.trustBadges && Object.keys(profile.trustBadges).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 justify-center sm:justify-start">
              {Object.entries(profile.trustBadges).map(([badge, count]) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 capitalize"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{badge.replace('_', ' ')}</span>
                  <span className="text-slate-400 font-normal">({count})</span>
                </span>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-center sm:justify-start">
            <ReportUserButton userId={id} />
          </div>
        </div>
      </div>

      {/* Active Listings by Seller */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          এই বিক্রেতার সক্রিয় বিজ্ঞাপনসমূহ ({listings.length})
        </h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            কোনো সক্রিয় বিজ্ঞাপন নেই।
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          ক্রেতা ও বিক্রেতার রেটিং ও রিভিউ ({reviews.length})
        </h2>
        {reviews.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {reviews.map((rev) => (
              <div key={rev.id} className="py-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{rev.reviewerName}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-800">{rev.rating}</span>
                  </div>
                </div>
                {rev.comment && (
                  <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                )}
                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {rev.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-medium capitalize"
                      >
                        ✓ {tag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">এখনো কোনো রিভিউ প্রদান করা হয়নি।</p>
        )}
      </div>
    </div>
  );
}

