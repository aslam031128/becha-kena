'use client';

import React from 'react';
import { Newspaper, Calendar, ArrowRight, Download, Mail } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function PressPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  const releases = [
    {
      date: isEn ? 'Nov 8, 2026' : '৮ নভেম্বর, ২০২৬',
      tag: 'Product Launch',
      title: isEn
        ? 'Becha-Kena officially launches as Bangladesh’s first 100% NID-verified C2C resale marketplace'
        : 'বাংলাদেশে প্রথম ১০০% NID-ভেরিফাইড সি২সি রিসেল প্ল্যাটফর্ম বেচা-কেনা-র আনুষ্ঠানিক যাত্রা শুরু',
      excerpt: isEn
        ? 'To counter rising classifieds fraud and impersonation, Becha-Kena introduces mandatory national identity checks and biometric facial verification for all sellers.'
        : 'অনলাইন সেকেন্ড-হ্যান্ড কেনাবেচায় ক্রমবর্ধমান প্রতারণা ও ভুয়া একাউন্ট রোধে সরকারের ডিজিটাল রূপান্তরের অংশ হিসেবে সম্পূর্ণ জাতীয় পরিচয়পত্র ও বায়োমেট্রিক সেলফি ভেরিফিকেশন ব্যবস্থা নিয়ে যাত্রা শুরু করলো বেচা-কেনা।',
      link: '#',
    },
    {
      date: isEn ? 'Oct 15, 2026' : '১৫ অক্টোবর, ২০২৬',
      tag: 'Security & Safety',
      title: isEn
        ? 'AI-driven scam detection and real-time fraud intervention launched to eliminate advance fee risks'
        : 'ক্লাসিফাইডসে অগ্রিম পেমেন্ট জালিয়াতি বন্ধে কৃত্রিম বুদ্ধিমত্তা ও রিয়েল-টাইম স্ক্যাম প্রটেকশন চালু',
      excerpt: isEn
        ? 'The Becha-Kena engineering team deployed automated chat filters and heuristic monitors that immediately block unauthorized payment solicitations and phishing links.'
        : 'চ্যাটবক্সে কোনো অননুমোদিত কুরিয়ার বা ফিশিং লিঙ্ক শেয়ার হলে তা স্বয়ংক্রিয়ভাবে ব্লক করার অত্যাধুনিক নিরাপত্তা ব্যবস্থা উন্মোচন করেছে বেচা-কেনা-র ইঞ্জিনিয়ারিং টিম।',
      link: '#',
    },
    {
      date: isEn ? 'Oct 1, 2026' : '১ অক্টোবর, ২০২৬',
      tag: 'Corporate Milestone',
      title: isEn
        ? 'Successful conclusion of Dhaka Metropolitan pilot program for safe hand-to-hand transactions'
        : 'ঢাকা মেট্রোপলিটন এলাকায় হ্যান্ড-টু-হ্যান্ড নিরাপদ লেনদেনের জন্য পাইলট প্রকল্পের সফল সমাপ্তি',
      excerpt: isEn
        ? 'With over 1,000 completed transactions and zero reported advance scams, the pilot demonstrates citizen demand for authenticated resale commerce.'
        : '১,০০০ সফল ডিলের মধ্য দিয়ে কোনো প্রকার অগ্রিম প্রতারণা ছাড়াই ক্রেতা ও বিক্রেতার পারস্পরিক আস্থার প্রমাণ দিলো বেচা-কেনা-র পাইলট প্রোগ্রাম।',
      link: '#',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <Newspaper className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? 'Press Room & Media Updates' : 'প্রেস রিলিজ ও নিউজ রুম'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Press Releases' : 'প্রেস রিলিজ (Press Releases)'}
          </h1>
          <p className="max-w-xl mx-auto text-sm text-slate-600 leading-relaxed">
            {isEn
              ? 'Official news releases, media announcements, and security milestones from the Becha-Kena team.'
              : 'বেচা-কেনা প্ল্যাটফর্মের সাম্প্রতিক আপডেট, অফিসিয়াল প্রেস বিবৃতি, নীতিগত ঘোষণা ও মিডিয়া কাভারেজ।'}
          </p>
        </div>

        {/* Press Releases List */}
        <div className="space-y-4">
          {releases.map((item, idx) => (
            <article
              key={idx}
              className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
            >
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.date}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  {item.tag}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug hover:text-emerald-600 transition-colors cursor-pointer">
                {item.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.excerpt}</p>

              <div className="pt-2">
                <a
                  href={item.link}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  <span>{isEn ? 'Read Full Statement' : 'সম্পূর্ণ বিবৃতি পড়ুন'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Media Kit & Inquiry Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {isEn ? 'Official Brand Assets & Logos' : 'অফিশিয়াল ব্র্যান্ড কিট ও লোগো'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isEn
                ? 'Download high-resolution official SVG and PNG logos, brand guidelines, and leadership portraits.'
                : 'সাংবাদিক ও মিডিয়া প্রতিনিধিদের জন্য বেচা-কেনা-র হাই-রেজুলেশন লোগো, ব্র্যান্ড কালার গাইড ও প্রেস কিট।'}
            </p>
            <button
              onClick={() => alert(isEn ? 'Press kit downloaded' : 'প্রেস কিট ডাউনলোড সম্পন্ন হয়েছে')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 pt-1"
            >
              <span>{isEn ? 'Download Media Kit (ZIP)' : 'মিডিয়া কিট ডাউনলোড করুন (ZIP)'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {isEn ? 'Media & Press Inquiries' : 'মিডিয়া যোগাযোগ'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isEn
                ? 'For interviews, corporate statements, or media commentary, reach our communications desk directly.'
                : 'প্রেস বিবৃতি বা যেকোনো মিডিয়া সাক্ষাৎকারের জন্য আমাদের কমিউনিকেশন ডেস্কের সাথে যোগাযোগ করুন।'}
            </p>
            <a
              href="mailto:press@becha-kena.com"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 pt-1"
            >
              <span>press@becha-kena.com</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
