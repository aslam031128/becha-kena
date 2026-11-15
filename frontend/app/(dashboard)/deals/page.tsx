'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, Calendar, CheckCircle2, Star, ExternalLink } from 'lucide-react';
import { Deal } from '@/lib/types/deal.types';
import { dealApi } from '@/lib/api/deal.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { resolveMediaUrl } from '@/lib/utils/media';
import toast from 'react-hot-toast';

export default function DealsHistoryPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    async function loadDeals() {
      try {
        setIsLoading(true);
        const res = await dealApi.getDeals();
        if (res.data.success && res.data.data) {
          setDeals(res.data.data);
        }
      } catch {
        toast.error('ডিল হিস্ট্রি লোড করতে ব্যর্থ হয়েছে');
      } finally {
        setIsLoading(false);
      }
    }
    loadDeals();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-600" />
          <span>আমার ডিল (My Deals)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          আপনার সম্পন্ন ও সক্রিয় সকল কেনাবেচার রিসিট এবং রিভিউ হিস্ট্রি
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-slate-400">ডিলসমূহ লোড হচ্ছে...</span>
        </div>
      ) : deals.length > 0 ? (
        <div className="space-y-4">
          {deals.map((deal) => {
            const isSeller = deal.sellerId === user?.id;
            const hasReviewed = isSeller ? deal.sellerReviewed : deal.buyerReviewed;
            const reviewWindowActive = new Date(deal.reviewWindowExpiresAt).getTime() > Date.now();

            return (
              <div
                key={deal.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(deal.listingImageUrl)}
                      alt={deal.listingTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{deal.dealReceiptNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {deal.listingTitle}
                    </h3>
                    <div className="text-sm font-black text-emerald-700">
                      ৳ {deal.finalPrice.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-600">
                      {isSeller ? (
                        <span>🤝 Sold to <strong>{deal.buyerName}</strong></span>
                      ) : (
                        <span>🛒 Bought from <strong>{deal.sellerName}</strong></span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(deal.completedAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>রিসিট দেখুন (View Receipt)</span>
                  </Link>

                  {!hasReviewed && reviewWindowActive && (
                    <Link
                      href={`/deals/${deal.id}`}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>রিভিউ দিন ⭐</span>
                    </Link>
                  )}

                  {!isSeller && deal.disputeStatus === 'none' && (
                    <Link
                      href={`/deals/${deal.id}#dispute`}
                      className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium"
                    >
                      বিরোধ দায়ের (Dispute)
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <Tag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">এখনো কোনো সম্পন্ন ডিল নেই</p>
          <p className="text-xs text-slate-400">
            বিজ্ঞাপন বিক্রি সম্পন্ন হলে বা পণ্য ক্রয় করলে এখানে রিসিট সংরক্ষিত থাকবে।
          </p>
        </div>
      )}
    </div>
  );
}

