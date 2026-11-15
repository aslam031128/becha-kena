'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, Star, Scale, FileText } from 'lucide-react';
import { Deal } from '@/lib/types/deal.types';
import { dealApi } from '@/lib/api/deal.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { ReviewForm } from '@/components/deal/review-form';
import { DisputeForm } from '@/components/deal/dispute-form';
import { resolveMediaUrl } from '@/lib/utils/media';
import toast from 'react-hot-toast';

interface DealReceiptPageProps {
  params: Promise<{ dealId: string }>;
}

export default function DealReceiptPage({ params }: DealReceiptPageProps) {
  const resolvedParams = use(params);
  const dealId = resolvedParams.dealId;
  const { user } = useAuthStore();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const loadDeal = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await dealApi.getDealById(dealId);
      if (res.data.success && res.data.data) {
        setDeal(res.data.data);
      }
    } catch {
      toast.error('ডিল রিসিট লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs text-slate-400">রিসিট লোড হচ্ছে...</span>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="py-20 text-center text-slate-500 text-sm">
        রিসিট খুঁজে পাওয়া যায়নি।
      </div>
    );
  }

  const isSeller = deal.sellerId === user?.id;
  const isBuyer = deal.buyerId === user?.id;
  const hasReviewed = isSeller ? deal.sellerReviewed : deal.buyerReviewed;
  const reviewWindowActive = new Date(deal.reviewWindowExpiresAt).getTime() > Date.now();

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <Link
          href="/deals"
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>সকল ডিলে ফিরে যান</span>
        </Link>
        <span className="text-xs font-mono font-bold text-slate-400">
          #{deal.dealReceiptNumber}
        </span>
      </div>

      {/* Printable / Immutable Deal Receipt */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">
                অফিসিয়াল ডিল রিসিট (Deal Receipt)
              </h1>
              <p className="text-[11px] text-slate-400">Becha-Kena C2C Verified Transaction</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        </div>

        {/* Product Details */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveMediaUrl(deal.listingImageUrl)} alt={deal.listingTitle} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{deal.listingTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              সম্পন্ন হওয়ার তারিখ: {new Date(deal.completedAt).toLocaleString()}
            </p>
            <div className="text-base font-black text-emerald-700 mt-1">
              চূড়ান্ত মূল্য: ৳ {deal.finalPrice.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Participants Bilateral Trust Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-slate-100 py-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">বিক্রেতা (Seller)</span>
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>{deal.sellerName}</span>
              {deal.sellerVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
            </p>
            <p className="text-[11px] text-slate-500">
              রিভিউ স্ট্যাটাস: {deal.sellerReviewed ? '✅ প্রদান করা হয়েছে' : 'অপেক্ষমান'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">ক্রেতা (Buyer)</span>
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>{deal.buyerName}</span>
              {deal.buyerVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
            </p>
            <p className="text-[11px] text-slate-500">
              রিভিউ স্ট্যাটাস: {deal.buyerReviewed ? '✅ প্রদান করা হয়েছে' : 'অপেক্ষমান'}
            </p>
          </div>
        </div>

        {/* Dispute Status Row */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>বিরোধের অবস্থা (Dispute Status):</span>
          <span className="font-semibold text-slate-800 capitalize">
            {deal.disputeStatus === 'none' ? 'কোনো অভিযোগ নেই (None)' : deal.disputeStatus}
          </span>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap gap-3 pt-2">
          {!hasReviewed && reviewWindowActive && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Star className="w-4 h-4 fill-white" />
              <span>রিভিউ প্রদান করুন (Leave Review)</span>
            </button>
          )}

          {isBuyer && deal.disputeStatus === 'none' && !showDisputeForm && (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Scale className="w-4 h-4" />
              <span>আইনি অভিযোগ দায়ের (File Dispute)</span>
            </button>
          )}
        </div>
      </div>

      {/* Review Form Drawer / Container */}
      {showReviewForm && (
        <ReviewForm
          dealId={deal.id}
          onSuccess={() => {
            setShowReviewForm(false);
            loadDeal();
          }}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Dispute Form Drawer / Container */}
      {showDisputeForm && (
        <div id="dispute">
          <DisputeForm
            dealId={deal.id}
            onSuccess={() => {
              setShowDisputeForm(false);
              loadDeal();
            }}
            onCancel={() => setShowDisputeForm(false)}
          />
        </div>
      )}
    </div>
  );
}

