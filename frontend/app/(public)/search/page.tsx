import React from 'react';
import { ListingCard } from '@/components/listing/listing-card';
import { FilterSidebar } from '@/components/listing/filter-sidebar';
import { SortSelect } from '@/components/listing/sort-select';
import { Listing, ListingSearchParams } from '@/lib/types/listing.types';
import { PackageOpen } from 'lucide-react';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchFilteredListings(params: ListingSearchParams): Promise<Listing[]> {
  try {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.condition) query.set('condition', params.condition);
    if (params.division) query.set('division', params.division);
    if (params.thana) query.set('thana', params.thana);
    if (params.minPrice) query.set('minPrice', params.minPrice.toString());
    if (params.maxPrice) query.set('maxPrice', params.maxPrice.toString());
    if (params.sort) query.set('sort', params.sort);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/listings?${query.toString()}`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const parsedParams: ListingSearchParams = {
    q: typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined,
    category: typeof resolvedParams.category === 'string' ? (resolvedParams.category as ListingSearchParams['category']) : undefined,
    condition: typeof resolvedParams.condition === 'string' ? (resolvedParams.condition as ListingSearchParams['condition']) : undefined,
    division: typeof resolvedParams.division === 'string' ? resolvedParams.division : undefined,
    thana: typeof resolvedParams.thana === 'string' ? resolvedParams.thana : undefined,
    minPrice: resolvedParams.minPrice ? Number(resolvedParams.minPrice) : undefined,
    maxPrice: resolvedParams.maxPrice ? Number(resolvedParams.maxPrice) : undefined,
    sort: typeof resolvedParams.sort === 'string' ? (resolvedParams.sort as ListingSearchParams['sort']) : 'newest',
  };

  const listings = await fetchFilteredListings(parsedParams);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Search & Filter Bar for Mobile */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {parsedParams.q ? `"${parsedParams.q}" এর ফলাফল` : 'সকল পণ্য অনুসন্ধান (Search)'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            মোট {listings.length} টি পণ্য খুঁজে পাওয়া গেছে
          </p>
        </div>

        {/* Sort Controls */}
        <SortSelect currentSort={parsedParams.sort || 'newest'} />
      </div>

      {/* Main Grid with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filter Column (Desktop) */}
        <div className="hidden lg:block lg:col-span-1">
          <FilterSidebar currentParams={parsedParams} />
        </div>

        {/* Right Listings Results Column */}
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
                কোনো পণ্য খুঁজে পাওয়া যায়নি (No products found)
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                আপনার ফিল্টার অথবা অনুসন্ধানের কি-ওয়ার্ড পরিবর্তন করে পুনরায় চেষ্টা করুন।
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

