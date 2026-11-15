'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function TermsPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold tracking-wide">
            <FileText className="w-4 h-4 text-slate-700" />
            <span>{isEn ? 'Legal Terms & User Agreement' : 'আইনি চুক্তি ও নীতিমালা'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Terms of Service' : 'ব্যবহারের শর্তাবলী (Terms of Service)'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEn
              ? 'Last updated: November 2026 · Governed by the Laws of the People’s Republic of Bangladesh'
              : 'সর্বশেষ সংস্করণ: নভেম্বর ২০২৬ · গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের আইন অনুযায়ী প্রযোজ্য'}
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-2xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              {isEn ? '1. Platform Overview & Acceptance of Agreement' : '১. প্ল্যাটফর্ম পরিচিতি ও চুক্তির গ্রহণযোগ্যতা'}
            </h2>
            <p>
              {isEn
                ? 'Becha-Kena (Becha-Kena.com) is an NID-verified peer-to-peer (C2C) second-hand resale marketplace. By browsing, posting listings, or communicating on this platform, you agree to be legally bound by these Terms of Service.'
                : 'বেচা-কেনা (Becha-Kena.com) একটি এনআইডি-যাচাইকৃত পারসন-টু-পারসন (C2C) ব্যবহৃত পণ্য পুনঃবিক্রয় মার্কেটপ্লেস। এই প্ল্যাটফর্ম ব্রাউজ, বিজ্ঞাপন পোস্ট বা কোনো ডিল সম্পন্ন করার মাধ্যমে আপনি এই ব্যবহারের শর্তাবলী ও নীতিমালার প্রতি আপনার পূর্ণ সম্মতি জ্ঞাপন করছেন।'}
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              {isEn ? '2. Eligibility & NID Identity Verification' : '২. অ্যাকাউন্ট খোলার যোগ্যতা ও NID ভেরিফিকেশন'}
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>{isEn ? 'Users must be at least 18 years of age to publish listings or trade on the platform.' : 'প্ল্যাটফর্মে যেকোনো বিজ্ঞাপন পোস্ট বা অন্য ব্যবহারকারীর সাথে ডিল করতে ন্যূনতম ১৮ বছর বয়স্ক হতে হবে।'}</li>
              <li>{isEn ? 'Every seller must verify their account using their own government-issued National ID (NID) and live biometric selfie.' : 'ব্যবহারকারীকে অবশ্যই তার নিজস্ব বৈধ জাতীয় পরিচয়পত্র (NID) এবং লাইভ সেলফি দিয়ে একাউন্ট ভেরিফাই করতে হবে।'}</li>
              <li>{isEn ? 'Using another person’s identity documents, fake names, or impersonating individuals is strictly illegal and will result in permanent ban and reporting to legal authorities.' : 'অন্য কারও জাতীয় পরিচয়পত্র, তথ্য বা ছদ্মনাম ব্যবহার করে একাউন্ট খোলা আইনত দণ্ডনীয় অপরাধ এবং এই জাতীয় একাউন্ট সাথে সাথে স্থায়ীভাবে বাতিল ও ব্ল্যাকলিস্ট করা হবে।'}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              {isEn ? '3. Prohibited Items & Stolen Goods Policy' : '৩. নিষিদ্ধ পণ্য ও চোরাই মালামাল সংক্রান্ত নীতি'}
            </h2>
            <p>
              {isEn
                ? 'Posting stolen electronics, counterfeit items, illegal narcotics, unlicensed weapons, or prescription drugs is strictly prohibited. If any item reported in a police General Diary (GD) is discovered, the seller’s identity will be surrendered to law enforcement authorities.'
                : 'চোরাই মোবাইল বা গ্যাজেট, জাল নথি, মাদকদ্রব্য, লাইসেন্সবিহীন অস্ত্র, প্রেসক্রিপশন ড্রাগ বা কোনো বেআইনি পণ্য প্ল্যাটফর্মে পোস্ট করা কঠোরভাবে নিষিদ্ধ। থানার জিডি (GD)-তে উল্লেখিত কোনো চোরাই পণ্যের তালিকা শনাক্ত হলে বিক্রেতার পরিচয় সরাসরি আইনশৃঙ্খলা রক্ষাকারী বাহিনীর কাছে হস্তান্তর করা হবে।'}
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              {isEn ? '4. Transactions & Zero Advance Fraud Policy' : '৪. লেনদেন ও অগ্রিম টাকা চাওয়ার নিষেধাজ্ঞা'}
            </h2>
            <p>
              {isEn
                ? 'Becha-Kena strictly enforces face-to-face inspection and cash-on-delivery. Demanding advance courier fees or booking money through mobile financial services is prohibited and will result in instant account suspension.'
                : 'বেচা-কেনা সম্পূর্ণভাবে সামনাসামনি পণ্য যাচাই ও ক্যাশ লেনদেন নীতিতে বিশ্বাস করে। বিকাশ, নগদ বা রকেটে কুরিয়ার চার্জ বা বুকিং ফি-এর নামে যেকোনো প্রকার অগ্রিম টাকা দাবি করা সম্পূর্ণ নিষিদ্ধ এবং এই জাতীয় বার্তা পাঠানো মাত্র একাউন্ট তাৎক্ষণিক স্থগিত করা হবে।'}
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              {isEn ? '5. Limitation of Liability' : '৫. দায়বদ্ধতার সীমাবদ্ধতা'}
            </h2>
            <p>
              {isEn
                ? 'Becha-Kena provides a secure discovery and identity verification infrastructure. Buyers and sellers must exercise standard personal precautions when meeting in person and completing financial handovers.'
                : 'বেচা-কেনা একটি মধ্যস্থতাকারী প্ল্যাটফর্ম হিসেবে ব্যবহারকারীদের পরিচয় যাচাই নিশ্চিত করে। তবে ব্যক্তিগত লেনদেন বা পণ্য ক্রয়ের চূড়ান্ত সিদ্ধান্ত ও হস্তান্তরের সময় ব্যবহারকারীদের নিজস্ব সতর্কতা অবলম্বন করতে হবে।'}
            </p>
          </section>
        </div>

        {/* Footer Navigation Link */}
        <div className="flex justify-between items-center text-xs text-slate-500 pt-4">
          <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
            &larr; {isEn ? 'Privacy Policy' : 'গোপনীয়তা নীতি (Privacy Policy)'}
          </Link>
          <Link href="/dispute-policy" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
            <span>{isEn ? 'Dispute Policy' : 'বিরোধ নিষ্পত্তি নীতিমালা'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
