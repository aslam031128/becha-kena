'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Target,
  Award,
  Lock,
  ArrowRight,
  TrendingUp,
  HeartHandshake,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function AboutPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  const values = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      title: isEn ? '100% Identity Verification (NID Verified)' : 'শতভাগ পরিচয় যাচাই (100% NID Verified)',
      desc: isEn
        ? 'No anonymous or fake accounts. Every buyer and seller undergoes real NID checks and biometric facial verification.'
        : 'কোনো বেনামী বা ফেক একাউন্ট নয়। প্রতিটি ক্রেতা ও বিক্রেতার জাতীয় পরিচয়পত্র ও লাইভ বায়োমেট্রিক সেলফি যাচাইয়ের মাধ্যমে প্রকৃত পরিচয় নিশ্চিত করা হয়।',
    },
    {
      icon: <Lock className="w-6 h-6 text-rose-600" />,
      title: isEn ? 'Zero Advance Fraud Policy' : 'জিরো অ্যাডভান্স স্ক্যাম নীতি (Zero Advance Fraud)',
      desc: isEn
        ? 'The primary risk in classifieds is advance courier fraud or fake booking fees. We enforce inspect-in-person and cash-on-hand safe trading.'
        : 'অনলাইন ক্লাসিফাইডসের সবচেয়ে বড় সমস্যা অগ্রিম কুরিয়ার চার্জ বা বুকিং মানির নামে প্রতারণা। আমরা কঠোরভাবে হাতে-হাতে যাচাই ও ক্যাশ লেনদেন নীতি প্রচার করি।',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      title: isEn ? 'Fair & Sustainable Resale Ecosystem' : 'ন্যায্য ও টেকসই রিসেল ইকোসিস্টেম',
      desc: isEn
        ? 'Promoting eco-friendly circular economy through trustworthy second-hand goods trade and fair valuation.'
        : 'ব্যবহৃত পণ্যের সঠিক মূল্যায়ন এবং পুনরায় ব্যবহারের মাধ্যমে পরিবেশবান্ধব টেকসই সার্কুলার অর্থনীতি তৈরি করা আমাদের অন্যতম লক্ষ্য।',
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-purple-600" />,
      title: isEn ? 'Citizen Trust & Complete Safety' : 'নাগরিক আস্থা ও নিরাপত্তা',
      desc: isEn
        ? 'Empowering millions of Bangladeshi citizens to buy and sell used products from home with zero fear and 100% legal traceability.'
        : 'বাংলাদেশের কোটি কোটি নাগরিক যেন কোনো আতঙ্ক ছাড়া ঘরে বসেই সেকেন্ড-হ্যান্ড পণ্য বিক্রি বা ক্রয় করতে পারেন, সেই নিশ্চয়তা দেওয়াই আমাদের অঙ্গীকার।',
    },
  ];

  const milestones = [
    { stat: '100%', label: isEn ? 'NID Verified Citizens' : 'এনআইডি ভেরিফাইড নাগরিক' },
    { stat: '0%', label: isEn ? 'Advance Scam Tolerance' : 'অগ্রিম প্রতারণা সহনশীলতা' },
    { stat: '15 Min', label: isEn ? 'Average Verification Time' : 'গড় ভেরিফিকেশন সময়' },
    { stat: '64', label: isEn ? 'Districts Nationwide' : 'জেলায় বিস্তৃত নেটওয়ার্ক' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Hero Banner */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? 'A Revolution in Safe Trading' : 'বিশ্বস্ত ও নিরাপদ কেনাবেচার বিপ্লব'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {isEn ? (
              <>
                Bangladesh&apos;s First <span className="text-emerald-600">NID-Verified</span> Resale Marketplace
              </>
            ) : (
              <>
                বাংলাদেশের প্রথম <span className="text-emerald-600">NID-ভেরিফাইড</span> রিসেল মার্কেটপ্লেস
              </>
            )}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? 'Becha-Kena was founded to bring absolute safety, transparency, and accountability to Bangladesh’s second-hand economy.'
              : 'বেচা-কেনা প্ল্যাটফর্মের মূল লক্ষ্য হলো ক্লাসিফাইডস ও অনলাইন সেকেন্ড-হ্যান্ড লেনদেনে শতভাগ স্বচ্ছতা ও নিরাপত্তা নিশ্চিত করা।'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {milestones.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs text-center"
            >
              <div className="text-2xl sm:text-4xl font-black text-emerald-600">{item.stat}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Mission & Vision Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-emerald-900 text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-800/80 flex items-center justify-center text-emerald-300">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">
                {isEn ? 'Our Mission' : 'আমাদের লক্ষ্য (Our Mission)'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                {isEn
                  ? 'To eliminate resale fraud completely by making government identity verification mandatory for all sellers, ensuring safe peer-to-peer commerce.'
                  : 'অনলাইন মার্কেটপ্লেস থেকে ভুয়া ও প্রতারণামূলক কর্মকাণ্ড সম্পূর্ণরূপে নির্মূল করা। ক্রেতা ও বিক্রেতার মাঝে এমন একটি নির্ভরযোগ্য সেতুবন্ধন তৈরি করা যেখানে প্রতিটি ডিল হবে ঝামেলামুক্ত ও ঝুঁকিমুক্ত।'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isEn ? 'Our Vision' : 'আমাদের ভিশন (Our Vision)'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isEn
                  ? 'To become South Asia’s most trusted verified circular commerce network, championing digital identity integration and consumer protection.'
                  : 'বাংলাদেশের প্রতিটি নাগরিক যেন আত্মবিশ্বাসের সাথে রিসেল পণ্য ক্রয় ও বিক্রয় করতে পারেন। একটি পরিচ্ছন্ন, দুর্নীতিমুক্ত এবং জাতীয়ভাবে দায়িত্বশীল প্ল্যাটফর্ম হিসেবে প্রতিষ্ঠিত হওয়া।'}
              </p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {isEn ? 'Our Core Principles' : 'আমাদের ৪টি মূল স্তম্ভ'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {isEn
                ? 'The safety principles that power every transaction on Becha-Kena'
                : 'যে নীতিগুলোর ওপর দাঁড়িয়ে নির্মিত হয়েছে দেশের সবচেয়ে নিরাপদ মার্কেটপ্লেস'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  {v.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900">{v.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-10 bg-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {isEn ? 'Ready to Start Safe Resale?' : 'নিরাপদে কেনাবেচা শুরু করতে প্রস্তুত?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {isEn
              ? 'Verify your identity in 2 minutes and join thousands of verified Bangladesh citizens.'
              : 'আজই আপনার জাতীয় পরিচয়পত্র যাচাই করে যুক্ত হোন দেশের সবচেয়ে বড় ভেরিফাইড নাগরিক কমিউনিটিতে।'}
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/listings/new"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              {isEn ? 'Post Ad for Free' : 'বিজ্ঞাপন দিন (ফ্রি)'}
            </Link>
            <Link
              href="/search"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors border border-slate-700 inline-flex items-center gap-1.5"
            >
              <span>{isEn ? 'Browse Listings' : 'বিজ্ঞাপন খুঁজুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
