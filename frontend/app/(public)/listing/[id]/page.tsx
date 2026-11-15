import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Eye, Clock, Tag } from 'lucide-react';
import { Listing } from '@/lib/types/listing.types';
import { ListingGallery } from '@/components/listing/listing-gallery';
import { ListingDetailActions } from '@/components/listing/listing-detail-actions';
import { ProductJsonLd } from '@/components/shared/json-ld';

interface ListingDetailPageProps {
  params: Promise<{ id: string }>;
}

async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/listings/${id}`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);

  if (!listing) {
    return {
      title: 'পণ্যটি খুঁজে পাওয়া যায়নি | Becha-Kena',
    };
  }

  return {
    title: `${listing.title} - ৳${listing.price.toLocaleString()} | Becha-Kena`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: `৳${listing.price.toLocaleString()} · ${listing.condition} · ${listing.location?.division || 'বাংলাদেশ'}`,
      images: listing.imageUrls?.[0] ? [listing.imageUrls[0]] : [],
      type: 'website',
    },
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const listing = await fetchListing(id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductJsonLd listing={listing} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery & Description */}
        <div className="lg:col-span-7 space-y-6">
          <ListingGallery
            images={listing.imageUrls}
            videoUrl={listing.videoUrl}
            title={listing.title}
          />

          {/* Description Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              পণ্যের বিবরণ (Description)
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {listing.description}
            </div>
          </div>

          {/* Location Map View placeholder */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>অবস্থান ও এলাকা (Location)</span>
            </h3>
            <p className="text-xs text-slate-600">
              {listing.location?.thana ? `${listing.location.thana}, ` : ''}{listing.location?.division || 'বাংলাদেশ'}
            </p>
            <div className="w-full h-44 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400">
              📍 Leaflet Map Pin ({listing.location?.coordinates ? `${listing.location.coordinates[1].toFixed(4)}, ${listing.location.coordinates[0].toFixed(4)}` : 'N/A'})
            </div>
          </div>
        </div>

        {/* Right Column: Key Details & Seller Call to Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 sticky top-20">
            {/* Condition & Category Badges */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold capitalize">
                {listing.condition.replace('_', ' ')}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium capitalize">
                <Tag className="w-3.5 h-3.5" />
                <span>{listing.category}</span>
              </span>
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {listing.title}
              </h1>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                ৳ {listing.price.toLocaleString()}
              </div>
            </div>

            {/* Metadata Stats Row */}
            <div className="flex items-center gap-4 text-xs text-slate-400 py-3 border-y border-slate-100">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{listing.viewCount} views</span>
              </span>
              <span>{listing.inquiryCount} inquiries</span>
            </div>

            {/* Interactive Actions (Phone reveal, chat, save, report) */}
            <ListingDetailActions listing={listing} />

            {/* Scam Warning Callout */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              ⚠️ <strong>সতর্কতা:</strong> পণ্য সশরীরে পরীক্ষা না করে কাউকে অগ্রিম টাকা বিকাশ বা নগদে পাঠাবেন না।
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

