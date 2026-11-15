'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, RefreshCw, Trash2, CheckCircle, Edit, AlertCircle, Eye, MessageSquare, ExternalLink } from 'lucide-react';
import { Listing } from '@/lib/types/listing.types';
import { listingApi } from '@/lib/api/listing.api';
import { dealApi } from '@/lib/api/deal.api';
import { resolveMediaUrl } from '@/lib/utils/media';
import { useAuth } from '@/lib/hooks/use-auth';
import toast from 'react-hot-toast';

type TabKey = 'active' | 'under_review' | 'under_offer' | 'sold' | 'expired';

export default function MyListingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mark as Sold Modal state
  const [selectedListingForSale, setSelectedListingForSale] = useState<Listing | null>(null);
  const [buyerIdInput, setBuyerIdInput] = useState('');
  const [finalPriceInput, setFinalPriceInput] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  // Fetch listings for current tab
  const fetchMyListings = useCallback(async (status: string) => {
    try {
      setIsLoading(true);
      const res = await listingApi.getMyListings(status);
      if (res.data.success && res.data.data) {
        setListings(res.data.data);
      }
    } catch {
      toast.error('লিস্টিং লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyListings(activeTab);
  }, [activeTab, fetchMyListings]);

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বিজ্ঞাপনটি মুছে ফেলতে চান?')) return;
    try {
      await listingApi.deleteListing(id);
      toast.success('বিজ্ঞাপন মুছে ফেলা হয়েছে');
      setListings((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error('মুছে ফেলা সম্ভব হয়নি');
    }
  };

  // Handle Renewal (Day 25+ or expired)
  const handleRenew = async (id: string) => {
    try {
      const res = await listingApi.renewListing(id);
      if (res.data.success) {
        toast.success('বিজ্ঞাপন সফলভাবে রিনিউ করা হয়েছে!');
        fetchMyListings(activeTab);
      }
    } catch {
      toast.error('রিনিউ করা সম্ভব হয়নি (সীমা অতিক্রম বা রিনিউ সময় হয়নি)');
    }
  };

  // Handle Mark as Sold
  const handleMarkAsSoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListingForSale || !buyerIdInput || !finalPriceInput) return;

    try {
      setIsSelling(true);
      await dealApi.directSale({
        listingId: selectedListingForSale.id,
        buyerId: buyerIdInput.trim(),
        finalPrice: Number(finalPriceInput),
      });
      toast.success('পণ্যটি সফলভাবে বিক্রি হিসেবে চিহ্নিত হয়েছে!');
      setSelectedListingForSale(null);
      fetchMyListings(activeTab);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'বিক্রি সম্পন্ন করা সম্ভব হয়নি';
      toast.error(msg);
    } finally {
      setIsSelling(false);
    }
  };

  const tabs: { key: TabKey; label: string; labelBn: string }[] = [
    { key: 'active', label: 'Active', labelBn: 'সক্রিয়' },
    { key: 'under_review', label: 'Under Review', labelBn: 'অনুমোদনাধীন' },
    { key: 'under_offer', label: 'Under Offer', labelBn: 'প্রস্তাবনাধীন' },
    { key: 'sold', label: 'Sold', labelBn: 'বিক্রিত' },
    { key: 'expired', label: 'Expired', labelBn: 'মেয়াদোত্তীর্ণ' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            আমার বিজ্ঞাপন (My Listings)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            আপনার সকল বিজ্ঞাপনের পরিসংখ্যান ও নিয়ন্ত্রণ কেন্দ্র
          </p>
        </div>

        <Link
          href="/listings/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide transition-all shadow-sm shadow-emerald-500/20 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>নতুন বিজ্ঞাপন (Post New Ad)</span>
        </Link>
      </div>

      {/* Unverified Alert Banner */}
      {user && !user.isNidVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">🛡️</span>
            <div>
              <p className="text-xs font-bold text-amber-950">
                বিজ্ঞাপন পোস্ট করার জন্য NID ভেরিফিকেশন সম্পন্ন করুন
              </p>
              <p className="text-[11px] text-amber-800">
                নিরাপদ লেনদেন ও বিশ্বস্ত ব্যাজের জন্য জাতীয় পরিচয়পত্র যাচাই আবশ্যক।
              </p>
            </div>
          </div>
          <Link
            href="/kyc?redirect=/listings/new"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold text-center flex-shrink-0 shadow-xs transition-colors"
          >
            এখনই NID ভেরিফাই করুন ➔
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${activeTab === tab.key
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
          >
            <span>{tab.labelBn}</span>
            <span className="ml-1 text-[11px] opacity-70">({tab.label})</span>
          </button>
        ))}
      </div>

      {/* Review Information Banner */}
      {activeTab === 'under_review' && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <span className="text-base">⏳</span>
          <span>এই বিজ্ঞাপনগুলো বর্তমানে অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন পাওয়ার পর তা স্বয়ংক্রিয়ভাবে সক্রিয় (Active) হবে।</span>
        </div>
      )}

      {/* Listings List Body */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs text-slate-400 font-medium">লোড হচ্ছে...</span>
        </div>
      ) : listings.length > 0 ? (
        <div className="space-y-3">
          {listings.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  <Image
                    src={resolveMediaUrl(item.imageUrls?.[0])}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.status === 'under_review' || item.moderationStatus === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                        <span>⏳</span>
                        <span>অনুমোদনাধীন (Under Review)</span>
                      </span>
                    ) : item.moderationStatus === 'rejected' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 border border-rose-200">
                        <span>❌</span>
                        <span>প্রত্যাখ্যাত (Rejected)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 capitalize border border-emerald-200">
                        {item.status.replace('_', ' ')}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      📍 {item.location?.division || 'বাংলাদেশ'}{item.location?.thana ? `, ${item.location.thana}` : ''}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate">{item.title}</h3>
                  <div className="text-sm font-extrabold text-emerald-700">
                    ৳ {item.price.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.viewCount} ভিউ
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {item.inquiryCount} চ্যাট
                    </span>
                    <span>রিনিউ: {item.renewCount}/{item.maxRenewals}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons depending on status */}
              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                <Link
                  href={`/listing/${item.id}`}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">দেখুন</span>
                </Link>

                <Link
                  href={`/listings/${item.id}/edit`}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">সম্পাদনা</span>
                </Link>

                {activeTab === 'active' && (
                  <>
                    <button
                      onClick={() => handleRenew(item.id)}
                      className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>রিনিউ</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedListingForSale(item);
                        setFinalPriceInput(item.price.toString());
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>বিক্রি সম্পন্ন</span>
                    </button>
                  </>
                )}

                {activeTab === 'expired' && item.renewCount < item.maxRenewals && (
                  <button
                    onClick={() => handleRenew(item.id)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>আবার চালু করুন</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  aria-label="Delete Listing"
                  className="p-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            এই ট্যাবে কোনো বিজ্ঞাপন নেই ({activeTab})
          </p>
          <p className="text-xs text-slate-400">
            নতুন পণ্য বিক্রির জন্য বিজ্ঞাপন দিন বাটনে ক্লিক করুন।
          </p>
        </div>
      )}

      {/* Mark as Sold Modal */}
      {selectedListingForSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              পণ্যটি বিক্রি সম্পন্ন হিসেবে চিহ্নিত করুন
            </h3>
            <p className="text-xs text-slate-500">
              ক্রেতার আইডি এবং চূড়ান্ত বিক্রয় মূল্য প্রদান করে সরাসরি ডিল সম্পন্ন করুন।
            </p>

            <form onSubmit={handleMarkAsSoldSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ক্রেতার ইউজার আইডি (Buyer User ID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Buyer User ID (from chat)"
                  value={buyerIdInput}
                  onChange={(e) => setBuyerIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  চূড়ান্ত বিক্রয় মূল্য (Final Price in BDT ৳)
                </label>
                <input
                  type="number"
                  required
                  min={50}
                  max={2500000}
                  value={finalPriceInput}
                  onChange={(e) => setFinalPriceInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedListingForSale(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSelling}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isSelling ? 'প্রক্রিয়াধীন...' : 'নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

