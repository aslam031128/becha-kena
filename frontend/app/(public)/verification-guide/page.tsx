'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  Camera,
  CheckCircle2,
  Lock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function VerificationGuidePage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  const steps = [
    {
      num: '1',
      icon: <CreditCard className="w-6 h-6 text-emerald-600" />,
      title: isEn ? 'Upload NID Card Photos' : 'জাতীয় পরিচয়পত্রের ছবি আপলোড',
      subtitle: 'Front & Back NID Photos',
      desc: isEn
        ? 'Take clear, glare-free photos of the front and back of your original NID card (Smart Card or laminated format). Ensure all four corners are visible.'
        : 'আপনার মূল NID কার্ডের (স্মার্ট কার্ড বা লেমিনেটেড কার্ড) সামনের ও পেছনের অংশের স্পষ্ট ছবি তুলুন। নিশ্চিত করুন যে কার্ডের কোণাগুলো কাটা পড়েনি এবং সমস্ত টেক্সট ও ছবি উজ্জ্বল আলোতে পরিষ্কার দেখা যাচ্ছে।',
      tips: isEn
        ? ['Avoid flashlight glare across text', 'Use original color cards, not photocopies']
        : ['ছবির উপর ফ্ল্যাশলাইটের অতিরিক্ত প্রতিফলন এড়িয়ে চলুন', 'ফটোকপি নয়, মূল কার্ডের আসল রঙিন ছবি ব্যবহার করুন'],
    },
    {
      num: '2',
      icon: <Camera className="w-6 h-6 text-blue-600" />,
      title: isEn ? 'Live Selfie Verification' : 'লাইভ সেলফি যাচাইকরণ',
      subtitle: 'Biometric Face Liveness',
      desc: isEn
        ? 'Capture a front-facing selfie within the on-screen circular frame. This confirms that the person operating the account is the real owner of the NID.'
        : 'মোবাইলের সামনের ক্যামেরা দিয়ে বৃত্তাকার ফ্রেমের ভেতরে আপনার মুখমণ্ডল রেখে একটি স্পষ্ট সেলফি তুলুন। এটি স্বয়ংক্রিয়ভাবে নিশ্চিত করে যে যিনি একাউন্ট চালাচ্ছেন তিনিই NID কার্ডের প্রকৃত মালিক।',
      tips: isEn
        ? ['Remove hats, sunglasses, and masks', 'Face the camera directly with good lighting']
        : ['টুপি, সানগ্লাস বা মাস্ক পরিধান করবেন না', 'ক্যামেরার দিকে সরাসরি তাকান এবং পর্যাপ্ত আলো রাখুন'],
    },
    {
      num: '3',
      icon: <CheckCircle2 className="w-6 h-6 text-purple-600" />,
      title: isEn ? 'Security Review & Approval' : 'অ্যাডমিন রিভিউ ও অনুমোদন',
      subtitle: 'Security Review & Badge',
      desc: isEn
        ? 'Once submitted, our security team validates your card details and selfie. Approvals typically take between 15 minutes to 2 hours.'
        : 'তথ্য জমা দেওয়ার পর আমাদের নিরাপত্তা টিম কার্ডের তথ্য ও সেলফি যত্নসহকারে মিলিয়ে দেখে অনুমোদন দেবে। সাধারণত ১৫ মিনিট থেকে সর্বোচ্চ ২ ঘণ্টার মধ্যে ভেরিফিকেশন সম্পন্ন হয়।',
      tips: isEn
        ? ['Get the green Verified Badge next to your name', 'Instantly post verified ads and trade with confidence']
        : ['অনুমোদন পেলে আপনার নামের পাশে সবুজ ভেরিফাইড ব্যাজ যুক্ত হবে', 'সরাসরি যেকোনো বিজ্ঞাপন পোস্ট ও নিরাপদ লেনদেন শুরু করতে পারবেন'],
    },
  ];

  const rejectionReasons = isEn
    ? [
        'Blurry, out-of-focus, or low-light photos where text and numbers cannot be read.',
        'Mismatch between the facial features on the NID and the live selfie photograph.',
        'Uploading photocopies, digital scans of scans, or black-and-white printouts instead of the original card.',
        'Expired identity cards or non-Bangladeshi identification documents.',
      ]
    : [
        'অস্পষ্ট, ঝাপসা বা আলো স্বল্পতায় তোলা ছবি যেখানে নাম ও NID নম্বর পড়া যায় না।',
        'NID কার্ডের মূল ছবির সাথে আপলোডকৃত লাইভ সেলফির চেহারায় বড় ধরনের অসঙ্গতি।',
        'আসল রঙিন কার্ডের পরিবর্তে ফটোকপি বা কাগজের প্রিন্টআউট আপলোড করা।',
        'মেয়াদোত্তীর্ণ পরিচয়পত্র বা ভিন্ন কোনো দেশের নাগরিকত্ব সংক্রান্ত নথিপত্র।',
      ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? 'Official Identity Verification Guide' : 'অফিশিয়াল ভেরিফিকেশন নির্দেশিকা'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {isEn ? (
              <>
                Achieve the <span className="text-emerald-600">NID Verified Badge</span> in 3 Simple Steps
              </>
            ) : (
              <>
                সহজ ৩টি ধাপে অর্জন করুন <span className="text-emerald-600">NID ভেরিফাইড ব্যাজ</span>
              </>
            )}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? 'Join Bangladesh’s most trusted resale community. Protect yourself and your buyers by validating your citizen identity.'
              : 'বেচা-কেনা প্ল্যাটফর্মে বিজ্ঞাপন পোস্ট ও কেনাবেচা করতে পরিচয় যাচাই বাধ্যতামূলক। জেনে নিন কীভাবে মাত্র কয়েক মিনিটে আপনার একাউন্ট ভেরিফাই করবেন।'}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none pointer-events-none">
                {step.num}
              </div>

              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-2xs">
                  {step.icon}
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    {step.subtitle}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{step.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2 relative z-10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isEn ? 'Important Tips:' : 'জরুরি টিপস:'}
                </span>
                {step.tips.map((tip, tIdx) => (
                  <div key={tIdx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Common Rejection Reasons */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isEn ? 'Common Reasons for Verification Rejection' : 'ভেরিফিকেশন বাতিলের সাধারণ কারণসমূহ'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEn ? 'Avoid these common mistakes to get verified quickly' : 'এই ভুলগুলো এড়িয়ে চললে আপনার আবেদন প্রথমবারেই অনুমোদিত হবে'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {rejectionReasons.map((reason, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-3"
              >
                <span className="text-rose-500 font-bold text-sm">✕</span>
                <span className="text-xs text-slate-700 leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Privacy Commitment */}
        <div className="bg-emerald-950 text-white rounded-3xl p-8 sm:p-12 space-y-6 relative overflow-hidden">
          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{isEn ? 'Data Privacy & Encryption' : 'তথ্য নিরাপত্তা ও ডেটা গোপনীয়তা'}</span>
            </div>
            <h3 className="text-xl sm:text-3xl font-bold">
              {isEn ? 'How Is Your NID Information Protected?' : 'আপনার NID তথ্য কিভাবে সুরক্ষিত রাখা হয়?'}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              {isEn
                ? 'Your identification documents are stored with bank-grade AES-256 KMS encryption. Your NID number is masked, and private identity files are never accessible to buyers, sellers, or third-party advertisers.'
                : 'আপনার আপলোডকৃত পরিচয়পত্র ও সেলফি ব্যাংক-লেভেল AES-256 KMS এনক্রিপশনের মাধ্যমে সংরক্ষিত থাকে। সাধারণ ব্যবহারকারী বা ক্রেতা-বিক্রেতাদের কাছে আপনার NID নম্বর কখনো উন্মুক্ত করা হয় না।'}
            </p>
          </div>

          <div className="pt-4 flex flex-wrap gap-4 relative z-10">
            <Link
              href="/kyc"
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEn ? 'Start Verification Now' : 'এখনই ভেরিফিকেশন শুরু করুন'}</span>
            </Link>
            <Link
              href="/safety-tips"
              className="px-6 py-3.5 bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 font-semibold rounded-2xl text-xs sm:text-sm transition-colors"
            >
              {isEn ? 'View Safe Trading Tips' : 'নিরাপদ কেনাবেচার টিপস দেখুন'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
