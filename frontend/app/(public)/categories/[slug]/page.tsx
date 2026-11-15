import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingCategory, Listing } from '@/lib/types/listing.types';
import { ListingCard } from '@/components/listing/listing-card';
import { FilterSidebar } from '@/components/listing/filter-sidebar';
import { PackageOpen } from 'lucide-react';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const validCategories: Record<string, { label: string; labelBn: string; icon: string }> = {
  electronics: { label: 'Electronics', labelBn: 'ইলেকট্রনিক্স', icon: '📱' },
  vehicles: { label: 'Vehicles', labelBn: 'যানবাহন', icon: '🚗' },
  property: { label: 'Property', labelBn: 'সম্পত্তি', icon: '🏠' },
  fashion: { label: 'Fashion', labelBn: 'ফ্যাশন', icon: '👗' },
  home: { label: 'Home & Living', labelBn: 'গৃহসজ্জা', icon: '🏡' },
  hobbies: { label: 'Hobbies', labelBn: 'শখের পণ্য', icon: '🎮' },
};

async function fetchCategoryListings(category: string): Promise<Listing[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/listings?category=${category}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = validCategories[slug];
  if (!meta) return { title: 'Category Not Found | Becha-Kena' };
  return {
    title: `${meta.label} (${meta.labelBn}) - Buy & Sell | Becha-Kena`,
    description: `Browse verified ${meta.label} listings on Becha-Kena, Bangladesh's NID-verified resale marketplace.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categoryMeta = validCategories[slug];

  if (!categoryMeta) {
    notFound();
  }

  const listings = await fetchCategoryListings(slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Category Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl">
            {categoryMeta.icon}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {categoryMeta.label} ({categoryMeta.labelBn})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              এই ক্যাটাগরিতে {listings.length} টি পণ্য সক্রিয় রয়েছে
            </p>
          </div>
        </div>

        <Link
          href="/search"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
        >
          সকল ক্যাটাগরি ব্রাউজ করুন →
        </Link>
      </div>

      {/* Main Grid with Sidebar Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="hidden lg:block lg:col-span-1">
          <FilterSidebar currentParams={{ category: slug as ListingCategory }} />
        </div>

        <div className="lg:col-span-3">
          {listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {listings.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
              <PackageOpen className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">
                এই ক্যাটাগরিতে আপাতত কোনো বিজ্ঞাপন নেই
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                আপনিই প্রথম বিজ্ঞাপনদাতা হয়ে এই ক্যাটাগরিতে বিজ্ঞাপন পোস্ট করুন।
              </p>
              <Link
                href="/listings/new"
                className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                বিজ্ঞাপন দিন (Post Ad)
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

