'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Server, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function PrivacyPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? 'Data Privacy & Encryption' : 'ডেটা প্রাইভেসী ও এনক্রিপশন নীতি'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Privacy Policy' : 'গোপনীয়তা নীতি (Privacy Policy)'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEn
              ? 'Last updated: November 2026 · Bank-grade AES-256 encryption protecting your identity'
              : 'সর্বশেষ সংস্করণ: নভেম্বর ২০২৬ · ব্যাংক-গ্রেড এনক্রিপশনে আপনার তথ্যের শতভাগ নিরাপত্তা'}
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-2xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <h2>{isEn ? '1. What Information We Collect' : '১. আমরা কি কি তথ্য সংগ্রহ করি?'}</h2>
            </div>
            <p>
              {isEn
                ? 'To maintain an authentic and fraud-free marketplace, Becha-Kena collects:'
                : 'নিরাপদ ট্রেডিং পরিবেশ বজায় রাখতে বেচা-কেনা নিচের তথ্যগুলো সংগ্রহ করে:'}
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li><strong>{isEn ? 'Mobile Number & Name:' : 'মোবাইল নম্বর ও নাম:'}</strong> {isEn ? 'For OTP authentication and user account management.' : 'ওটিপি ভেরিফিকেশন ও একাউন্ট পরিচালনার জন্য।'}</li>
              <li><strong>{isEn ? 'National ID (NID) Data:' : 'জাতীয় পরিচয়পত্র (NID) ডেটা:'}</strong> {isEn ? 'NID photos, number, and date of birth for identity verification.' : 'NID কার্ডের ছবি, NID নম্বর এবং জন্ম তারিখ।'}</li>
              <li><strong>{isEn ? 'Biometric Selfie:' : 'বায়োমেট্রিক সেলফি:'}</strong> {isEn ? 'Facial liveness verification to ensure account belongs to NID holder.' : 'লাইভনেস ডিটেকশন ও আসল পরিচয় নিশ্চিত করতে ফ্রন্ট ক্যামেরা ছবি।'}</li>
              <li><strong>{isEn ? 'Technical Audit Logs:' : 'টেকনিক্যাল অডিট ডেটা:'}</strong> {isEn ? 'Device UUID, IP address, and security audit timestamps.' : 'ডিভাইসের ইউআইডি, আইপি অ্যাড্রেস এবং লগইন টাইমস্ট্যাম্প।'}</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-2">
              <Server className="w-4 h-4 text-blue-600" />
              <h2>{isEn ? '2. NID & Biometric Storage Security (AES-256 KMS)' : '২. NID ও বায়োমেট্রিক তথ্যের সর্বোচ্চ নিরাপত্তা (AES-256 KMS)'}</h2>
            </div>
            <p>
              {isEn
                ? 'Your identity documents are encrypted at rest using Amazon Web Services Key Management Service (AWS KMS) AES-256 encryption. Only authorized security personnel have strictly audited access during verification reviews.'
                : 'আপনার আপলোডকৃত পরিচয়পত্র ও সংবেদনশীল ছবি ক্লাউড স্টোরেজে AES-256 KMS এনক্রিপশনের মাধ্যমে সংরক্ষিত থাকে। কোনো সাধারণ কর্মচারী বা বাইরের কেউ সরাসরি এই ডেটা অ্যাক্সেস করতে পারে না। শুধুমাত্র অনুমোদিত ভেরিফিকেশন অফিসাররাই অডিট ট্রেইলের আওতায় সীমিত সময়ের জন্য ফাইল পর্যবেক্ষণ করেন।'}
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <h2>{isEn ? '3. Public Profile Information & NID Masking' : '৩. সাধারণ ব্যবহারকারীদের কাছে তথ্যের গোপনীয়তা'}</h2>
            </div>
            <p>
              {isEn
                ? 'Your private NID card and selfie are NEVER shown on public profiles. Other users see only your name and a green "NID Verified" badge.'
                : 'সাধারণ কোনো ক্রেতা বা বিক্রেতা কখনোই আপনার NID কার্ড বা ব্যক্তিগত সেলফি দেখতে পাবে না। পাবলিক প্রোফাইলে কেবল আপনার নাম, যোগদানের সময় এবং একটি সবুজ "NID Verified" ব্যাজ প্রদর্শিত হয়।'}
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-100 pb-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <h2>{isEn ? '4. Third-Party Data Sharing Prohibition' : '৪. তৃতীয় পক্ষের সাথে ডেটা বিক্রয় সম্পূর্ণ নিষিদ্ধ'}</h2>
            </div>
            <p>
              {isEn
                ? 'We strictly NEVER sell, rent, or trade your personal information to advertising networks, marketers, or third-party organizations.'
                : 'বেচা-কেনা তার কোনো ব্যবহারকারীর ব্যক্তিগত তথ্য, ফোন নম্বর বা NID ডেটা বাণিজ্যিক উদ্দেশ্যে কোনো বিজ্ঞাপন সংস্থা, মার্কেটিং কোম্পানি বা তৃতীয় পক্ষের কাছে বিক্রয় বা হস্তান্তর করে না।'}
            </p>
          </section>
        </div>

        {/* Footer Navigation Link */}
        <div className="flex justify-between items-center text-xs text-slate-500 pt-4">
          <Link href="/terms" className="hover:text-emerald-600 transition-colors">
            &larr; {isEn ? 'Terms of Service' : 'ব্যবহারের শর্তাবলী (Terms)'}
          </Link>
          <Link href="/dispute-policy" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
            <span>{isEn ? 'Dispute Resolution Policy' : 'বিরোধ নিষ্পত্তি নীতিমালা'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
