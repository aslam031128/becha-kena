'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Trash2, TrendingDown, ArrowRight, ExternalLink } from 'lucide-react';
import { favoriteApi, FavoriteItem } from '@/lib/api/favorite.api';
import { resolveMediaUrl } from '@/lib/utils/media';
import toast from 'react-hot-toast';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      try {
        setIsLoading(true);
        const res = await favoriteApi.getFavorites();
        if (res.data.success && res.data.data) {
          setFavorites(res.data.data);
        }
      } catch {
        toast.error('সংরক্ষিত পণ্য লোড করতে ব্যর্থ হয়েছে');
      } finally {
        setIsLoading(false);
      }
    }
    loadFavorites();
  }, []);

  const handleRemove = async (listingId: string) => {
    // Optimistic UI update
    const previous = [...favorites];
    setFavorites((prev) => prev.filter((item) => item.listingId !== listingId));

    try {
      await favoriteApi.removeFavorite(listingId);
      toast.success('ফেভারিট থেকে সরানো হয়েছে');
    } catch {
      setFavorites(previous);
      toast.error('সরানো সম্ভব হয়নি');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <span>সংরক্ষিত পণ্যসমূহ (Saved Items)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          আপনার পছন্দ করা বিজ্ঞাপনের তালিকা ও তাৎক্ষণিক মূল্য হ্রাস (Price Drop) পর্যবেক্ষণ
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-slate-400">সংরক্ষিত পণ্য লোড হচ্ছে...</span>
        </div>
      ) : favorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => {
            const isUnavailable = ['sold', 'expired', 'archived'].includes(fav.listing?.status);
            const priceDrop = fav.priceAtSave - (fav.listing?.price || fav.priceAtSave);

            return (
              <div
                key={fav.id}
                className="relative bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                {/* Unavailable Overlay */}
                {isUnavailable && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs z-20 flex items-center justify-center text-white font-black text-xs uppercase tracking-widest">
                    ⚫ Sold / Unavailable
                  </div>
                )}

                <div>
                  <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(fav.listing?.imageUrls?.[0])}
                      alt={fav.listing?.title || 'Listing'}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemove(fav.listingId)}
                      aria-label="Remove from favorites"
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-500 hover:text-red-600 shadow-sm transition-colors z-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                      {fav.listing?.title}
                    </h3>

                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-slate-900">
                        ৳ {fav.listing?.price?.toLocaleString()}
                      </span>
                      {fav.priceAtSave !== fav.listing?.price && (
                        <span className="text-xs text-slate-400 line-through">
                          ৳ {fav.priceAtSave.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Price Drop Indicator */}
                    {fav.isPriceDropped && priceDrop > 0 ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                        <span>📉 ৳{priceDrop.toLocaleString()} দাম কমেছে!</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">দামে কোনো পরিবর্তন হয়নি</span>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Link
                    href={`/listing/${fav.listingId}`}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>বিজ্ঞাপন দেখুন (View)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-3">
          <Heart className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">কোনো সংরক্ষিত পণ্য নেই</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            পণ্য ব্রাউজ করার সময় হার্ট আইকন চাপুন, যাতে যেকোনো সময় সহজেই খুঁজে পান।
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
          >
            <span>পণ্য ব্রাউজ করুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

