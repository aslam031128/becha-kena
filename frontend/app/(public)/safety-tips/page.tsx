'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  Eye,
  MapPin,
  CreditCard,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function SafetyTipsPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  const buyerTips = [
    {
      icon: <CreditCard className="w-5 h-5 text-rose-600" />,
      title: isEn ? 'Never send advance money or courier fees' : 'কখনোই অগ্রিম টাকা বা কুরিয়ার চার্জ পাঠাবেন না',
      desc: isEn
        ? 'Do not transfer money via bKash, Nagad, or bank before inspecting the product in person, even if disguised as courier booking.'
        : 'পণ্য হাতে পেয়ে যাচাই করার আগে বিকাশ, নগদ বা ব্যাংক ট্রান্সফারের মাধ্যমে কোনো টাকা, এমনকি কুরিয়ার ভাড়ার নামেও অগ্রিম দেবেন না।',
    },
    {
      icon: <MapPin className="w-5 h-5 text-emerald-600" />,
      title: isEn ? 'Meet in safe and crowded public places' : 'নিরাপদ ও জনবহুল স্থানে দেখা করুন',
      desc: isEn
        ? 'Complete the transaction during daylight hours in shopping malls, metro stations, petrol pumps, or recognizable public hubs.'
        : 'দিনের আলোতে শপিং মল, মেট্রো স্টেশন, পেট্রোল পাম্প বা পরিচিত পাবলিক প্লেসে দেখা করে পণ্য পরীক্ষা ও লেনদেন সম্পন্ন করুন।',
    },
    {
      icon: <Eye className="w-5 h-5 text-blue-600" />,
      title: isEn ? 'Thoroughly test and inspect items on-site' : 'পণ্য হাতে নিয়ে ভালোভাবে পরীক্ষা করুন',
      desc: isEn
        ? 'For phones and electronics, verify the IMEI, camera, charging port, SIM detection, original purchase receipt, and warranty validity.'
        : 'মোবাইল বা ইলেকট্রনিক্স পণ্যের ক্ষেত্রে IMEI চেক করুন, ক্যামেরা, চার্জিং, সিম স্লট এবং আসল রিসিট/ওয়ারেন্টি কার্ড যাচাই করুন।',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-teal-600" />,
      title: isEn ? 'Verify the green NID Verified badge' : 'সবুজ NID Verified ব্যাজ নিশ্চিত করুন',
      desc: isEn
        ? 'Transact exclusively with verified citizens on Becha-Kena whose identity is authenticated via government NID.'
        : 'বেচা-কেনা প্ল্যাটফর্মে কেবল সরকারি জাতীয় পরিচয়পত্র দ্বারা যাচাইকৃত নাগরিকদের সাথেই নিরাপদ ও নিশ্চিন্ত কেনাবেচা করুন।',
    },
  ];

  const sellerTips = [
    {
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      title: isEn ? 'Confirm cash or direct SMS notification on your phone' : 'হাতে হাতে ক্যাশ বা ব্যালেন্স নিশ্চিত করুন',
      desc: isEn
        ? 'Never rely on screenshots shown on a buyer’s phone. Always check the official incoming SMS alert on your own personal device.'
        : 'ক্রেতার মোবাইল স্ক্রিনশট দেখে বিশ্বাস করবেন না। নিজের ফোনে বিকাশ/নগদের অফিশিয়াল SMS চেক করে ব্যালেন্স কনফার্ম করুন।',
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      title: isEn ? 'Never click unknown links or external payment portals' : 'অচেনা লিঙ্কে ক্লিক করবেন না',
      desc: isEn
        ? 'If someone in chat sends links claiming to be an escrow portal or app installation, report them immediately.'
        : 'চ্যাটে কেউ কোনো পেমেন্ট গেটওয়ে, এসক্রো সার্ভিস বা অ্যাপ ইন্সটল করার লিঙ্ক পাঠালে কখনো তাতে প্রবেশ করবেন না।',
    },
    {
      icon: <Eye className="w-5 h-5 text-purple-600" />,
      title: isEn ? 'Provide authentic photos and transparent descriptions' : 'পণ্যের সঠিক ও বাস্তব বিবরণ দিন',
      desc: isEn
        ? 'Disclose any scuffs or issues honestly in your listing. Use actual real-world photos to ensure mutual satisfaction.'
        : 'পণ্যের কোনো দাগ বা ত্রুটি থাকলে তা বিজ্ঞাপনে স্পষ্টভাবে উল্লেখ করুন। বাস্তব ছবি ব্যবহার করুন যাতে কোনো ভুল বোঝাবুঝি না হয়।',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Hero Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? '100% Verified Safe Marketplace' : '১০০% নিরাপদ রিসেল মার্কেটপ্লেস'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Safe Resale Guidelines & Tips' : 'নিরাপদ কেনাবেচার টিপস (Safety Tips)'}
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            {isEn
              ? 'Becha-Kena is an NID-verified marketplace. Following these simple precautions ensures complete peace of mind.'
              : 'বেচা-কেনা একটি NID-ভেরিফাইড প্ল্যাটফর্ম। তবে ব্যক্তিগত পর্যায়ে লেনদেনের সময় সামান্য সতর্কতা আপনাকে শতভাগ নিরাপদ রাখবে।'}
          </p>
        </div>

        {/* Golden Rule Banner */}
        <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white shadow-lg space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              {isEn ? 'The Golden Rule: Never send advance money' : 'সোনালী নিয়ম: কখনোই কোনো অগ্রিম টাকা দেবেন না'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-rose-50 leading-relaxed pl-10">
            {isEn
              ? '"Send 200 Tk for courier" or "Send 500 Tk booking fee" — these requests are typical signs of fraud. Only pay after inspecting the product face-to-face.'
              : '“কুরিয়ার চার্জের জন্য ২০০ টাকা পাঠান” বা “পণ্য বুকিংয়ের জন্য ৫০০ টাকা দিন” — এই ধরনের যেকোনো অনুরোধ প্রতারণার লক্ষণ। পণ্য সামনাসামনি দেখে বুঝে পাওয়ার পরই কেবল লেনদেন করবেন।'}
          </p>
        </div>

        {/* Buyer Section */}
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">🛒</span>
              <span>{isEn ? 'Safety Guidelines for Buyers' : 'ক্রেতাদের জন্য নিরাপত্তা নির্দেশিকা'}</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Buyer Safety</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buyerTips.map((tip, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0">
                  {tip.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">{tip.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seller Section */}
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-blue-100 text-blue-700">📦</span>
              <span>{isEn ? 'Safety Guidelines for Sellers' : 'বিক্রেতাদের জন্য নিরাপত্তা নির্দেশিকা'}</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Seller Safety</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sellerTips.map((tip, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0">
                  {tip.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">{tip.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold">
              {isEn ? 'Suspecting Fraud or Unsafe Activity?' : 'কোনো সন্দেহভাজন প্রতারণা বা হুমকি লক্ষ্য করেছেন?'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isEn
                ? 'Report instantly to our 24/7 moderation and legal escalation team.'
                : 'দেরি না করে তৎক্ষণাৎ আমাদের সাপোর্ট টিম বা সাইট মডারেশন টিমের কাছে রিপোর্ট করুন।'}
            </p>
          </div>
          <Link
            href="/contact"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5"
          >
            <span>{isEn ? 'Report to Support' : 'সাপোর্টে রিপোর্ট করুন'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
