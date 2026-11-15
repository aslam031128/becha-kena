'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Star, ShieldCheck } from 'lucide-react';
import { Listing, ListingCondition } from '@/lib/types/listing.types';
import { resolveMediaUrl } from '@/lib/utils/media';

interface ListingCardProps {
  listing: Listing;
  onFavoriteToggle?: () => void;
  isFavorited?: boolean;
}

const conditionConfig: Record<
  ListingCondition,
  { label: string; bgClass: string; textClass: string }
> = {
  brand_new: { label: 'Brand New', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800' },
  like_new: { label: 'Like New', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  gently_used: { label: 'Gently Used', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
  heavily_used: { label: 'Heavily Used', bgClass: 'bg-orange-100', textClass: 'text-orange-800' },
};

export function ListingCard({
  listing,
  onFavoriteToggle,
  isFavorited = false,
}: ListingCardProps) {
  const condition = conditionConfig[listing.condition] || {
    label: listing.condition,
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
  };

  const coverImage = resolveMediaUrl(listing.imageUrls?.[0]);

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col">
      {/* Thumbnail + Overlays */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        <Link href={`/listing/${listing.id}`} className="block w-full h-full">
          {coverImage.startsWith('http') || coverImage.startsWith('/') ? (
            <Image
              src={coverImage}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
              No Image
            </div>
          )}
        </Link>

        {/* Condition Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-xs ${condition.bgClass} ${condition.textClass}`}
          >
            {condition.label}
          </span>
        </div>

        {/* Favorite Heart Button */}
        {onFavoriteToggle && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle();
            }}
            aria-label="Save to favorites"
            className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-red-500 shadow-sm backdrop-blur-xs transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-600'
              }`}
            />
          </button>
        )}
      </div>

      {/* Body Details */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <Link href={`/listing/${listing.id}`}>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug">
              {listing.title}
            </h3>
          </Link>

          {/* Location & Seller Rating */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span className="flex items-center gap-1 truncate max-w-[65%]">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">
                {listing.location?.division || 'বাংলাদেশ'}{listing.location?.thana ? `, ${listing.location.thana}` : ''}
              </span>
            </span>

            {listing.seller && (
              <span className="flex items-center gap-1 font-medium text-slate-700 flex-shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>
                  {listing.seller.averageRating > 0
                    ? listing.seller.averageRating.toFixed(1)
                    : 'New'}
                </span>
                {listing.seller.totalDealsCompleted > 0 && (
                  <span className="text-slate-400">({listing.seller.totalDealsCompleted})</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Price & NID Badge */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="text-base font-extrabold text-slate-900">
            ৳ {listing.price.toLocaleString()}
          </div>

          {listing.seller?.isNidVerified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>NID Verified</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

