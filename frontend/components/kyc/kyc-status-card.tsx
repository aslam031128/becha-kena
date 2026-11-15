'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Clock, AlertTriangle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { KycStatus } from '@/lib/types/user.types';

interface KycStatusCardProps {
  status: KycStatus;
  attemptsCount?: number;
}

export function KycStatusCard({ status }: KycStatusCardProps) {
  switch (status) {
    case 'verified':
      return (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">NID ভেরিফাইড নাগরিক (Verified ✅)</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                আপনার অ্যাকাউন্ট সফলভাবে ভেরিফাই করা হয়েছে। সব ফিচার ব্যবহার করতে পারবেন।
              </p>
            </div>
          </div>
        </div>
      );

    case 'pending':
      return (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center animate-spin">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">যাচাই প্রক্রিয়াধীন (Under Review)</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                আপনার তথ্য প্রক্রিয়া করা হচ্ছে। কিছুক্ষণের মধ্যে জানানো হবে।
              </p>
            </div>
          </div>
        </div>
      );

    case 'manual_review':
      return (
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950">ম্যানুয়াল রিভিউ চলছে (Manual Review)</h4>
              <p className="text-xs text-blue-700 mt-0.5">
                আমাদের মডারেশন টিম পর্যালোচনা করছে। সর্বোচ্চ ৪ ঘণ্টার মধ্যে ফলাফল জানানো হবে।
              </p>
            </div>
          </div>
        </div>
      );

    case 'retake_required':
      return (
        <div className="p-5 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-orange-950">পুনরায় ছবি তুলুন (Retake Required)</h4>
              <p className="text-xs text-orange-700 mt-0.5">
                ছবি ঝাপসা বা আলো কম থাকায় পরিচয় মেলেনি। অনুগ্রহ করে আবার চেষ্টা করুন।
              </p>
            </div>
          </div>
          <Link
            href="/kyc"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors self-end sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>আবার চেষ্টা করুন</span>
          </Link>
        </div>
      );

    case 'unverified':
    default:
      return (
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">পরিচয় নিশ্চিত করা হয়নি (Unverified)</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                বিজ্ঞাপন পোস্ট বা নিরাপদ কেনাবেচা করতে NID যাচাইকরণ সম্পন্ন করুন।
              </p>
            </div>
          </div>
          <Link
            href="/kyc"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors self-end sm:self-auto shadow-xs"
          >
            <span>ভেরিফিকেশন শুরু করুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      );
  }
}

