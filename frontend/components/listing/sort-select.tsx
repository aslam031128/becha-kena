'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SortSelectInner({ currentSort = 'newest' }: { currentSort?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 self-end sm:self-auto">
      <span className="text-xs text-slate-500 font-medium">সর্ট করুন:</span>
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="newest">নতুন পণ্য (Newest)</option>
        <option value="price_low">দাম: কম থেকে বেশি (Price: Low → High)</option>
        <option value="price_high">দাম: বেশি থেকে কম (Price: High → Low)</option>
      </select>
    </div>
  );
}

export function SortSelect(props: { currentSort?: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">সর্ট করুন:</span>
          <div className="h-8 w-28 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <SortSelectInner {...props} />
    </Suspense>
  );
}
