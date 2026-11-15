'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Search, ShieldCheck, PlusCircle, CreditCard, Lock, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

type FaqCategoryKey = 'all' | 'kyc' | 'listing' | 'deal' | 'account';

interface FaqItem {
  questionBn: string;
  answerBn: string;
  questionEn: string;
  answerEn: string;
  category: 'kyc' | 'listing' | 'deal' | 'account';
}

const faqs: FaqItem[] = [
  // KYC
  {
    category: 'kyc',
    questionBn: 'কেন জাতীয় পরিচয়পত্র (NID) যাচাইকরণ বাধ্যতামূলক?',
    answerBn: 'বেচা-কেনা বাংলাদেশের একমাত্র ১০০% ভেরিফাইড রিসেল প্ল্যাটফর্ম। ফেক একাউন্ট, চোরাই পণ্যের বিজ্ঞাপন এবং অগ্রিম টাকা হাতিয়ে নেওয়ার মতো অনলাইন প্রতারণা পুরোপুরি নির্মূল করতেই প্রতিটি ব্যবহারকারীর NID ভেরিফিকেশন নিশ্চিত করা হয়।',
    questionEn: 'Why is National Identity Card (NID) verification mandatory?',
    answerEn: 'Becha-Kena is Bangladesh\'s only 100% verified resale marketplace. To completely eliminate fake accounts, stolen items, and advance payment fraud, every user must be verified via their official NID.',
  },
  {
    category: 'kyc',
    questionBn: 'NID ভেরিফিকেশনে কত সময় লাগে?',
    answerBn: 'আপনার NID কার্ডের ছবি ও সেলফি আপলোড করার পর অ্যাডমিন ও সিকিউরিটি টিম সাধারণত ১৫ মিনিট থেকে সর্বোচ্চ ২ ঘণ্টার মধ্যে তা ম্যানুয়ালি যাচাই করে অনুমোদন দেয় (সকাল ৯টা - রাত ৯টা)।',
    questionEn: 'How long does NID verification take?',
    answerEn: 'After uploading your NID card photos and live selfie, our security team reviews and approves it within 15 minutes to a maximum of 2 hours during operational hours (9 AM - 9 PM).',
  },
  {
    category: 'kyc',
    questionBn: 'আমার NID কার্ড ও সেলফি কি নিরাপদ থাকবে?',
    answerBn: 'হ্যাঁ, সম্পূর্ণ নিরাপদ। আপনার NID নম্বরটি সরকারি নির্দেশিকা অনুযায়ী মাস্ক করা থাকে এবং স্পর্শকাতর ডেটা ব্যাংক-লেভেল AES-256 KMS এনক্রিপশনের মাধ্যমে সংরক্ষিত হয়। এটি কখনোই কোনো তৃতীয় পক্ষ বা অন্যান্য সাধারণ ব্যবহারকারীদের কাছে প্রকাশ করা হয় না।',
    questionEn: 'Is my NID card and selfie data safe?',
    answerEn: 'Yes, absolutely safe. Your NID number is masked according to regulatory standards, and sensitive documents are protected with bank-grade AES-256 encryption. We never share your private documents with third parties or other users.',
  },
  {
    category: 'kyc',
    questionBn: 'লেমিনেটেড কার্ড বা স্মার্ট কার্ড — দুটোই কি গ্রহণযোগ্য?',
    answerBn: 'হ্যাঁ! ১০ ডিজিটের স্মার্ট কার্ড বা পুরাতন ১৩/১৭ ডিজিটের লেমিনেটেড জাতীয় পরিচয়পত্র — উভয় ফরম্যাটই আমাদের প্ল্যাটফর্মে গ্রহণযোগ্য। শুধু ছবি তোলার সময় লেখাগুলো যেন স্পষ্ট ও পড়ার উপযোগী থাকে তা নিশ্চিত করুন।',
    questionEn: 'Are both laminated cards and Smart NIDs accepted?',
    answerEn: 'Yes! Both 10-digit Smart NID cards and traditional 13/17-digit laminated identity cards are accepted. Please ensure that photos are crisp and clearly legible.',
  },

  // Listings
  {
    category: 'listing',
    questionBn: 'আমি মাসে কয়টি বিজ্ঞাপন বিনামূল্যে পোস্ট করতে পারব?',
    answerBn: 'ব্যক্তিগত একাউন্ট থেকে একজন ব্যবহারকারী প্রতি ৩০ দিনে সর্বোচ্চ ৫টি সক্রিয় বিজ্ঞাপন বিনামূল্যে পোস্ট করতে পারবেন। এতে অপ্রয়োজনীয় স্প্যামিং রোধ হয় এবং প্রকৃত রিসেলাররা প্রাধান্য পান।',
    questionEn: 'How many ads can I post for free each month?',
    answerEn: 'Each personal account can post up to 5 active ads for free every 30 days. This prevents spamming and ensures authentic individual sellers receive top visibility.',
  },
  {
    category: 'listing',
    questionBn: 'বিজ্ঞাপন পোস্ট করার পর সরাসরি সাইটে দেখতে পাচ্ছি না কেন?',
    answerBn: 'আমাদের নিরাপত্তা নীতিমালা অনুযায়ী, প্রতিটি বিজ্ঞাপন প্রথমে অ্যাডমিন মডারেশন কিউতে জমা হয়। কনটেন্ট ও পণ্যের ছবি যাচাইয়ের পর অ্যাডমিন অনুমোদন দিলে তা সাথে সাথে সাইটে সক্রিয় (Live) হয়ে যায়।',
    questionEn: 'Why is my ad not visible immediately after posting?',
    answerEn: 'Under our strict safety policy, every new ad is first inspected in our admin moderation queue. Once our security team verifies the content and photos, it is immediately approved and published live.',
  },
  {
    category: 'listing',
    questionBn: 'বিজ্ঞাপনের মেয়াদ কতদিন থাকে এবং কিভাবে রিনিউ করব?',
    answerBn: 'প্রতিটি বিজ্ঞাপনের প্রাথমিক মেয়াদ থাকে ৩০ দিন। ২৫ দিন অতিক্রান্ত হওয়ার পর অথবা মেয়াদ শেষ হলে আপনার ড্যাশবোর্ডের "আমার বিজ্ঞাপন" সেকশন থেকে বিনামূল্যে বিজ্ঞাপনটি রিনিউ (পুনর্নবীকরণ) করতে পারবেন।',
    questionEn: 'How long does an ad remain active and how do I renew it?',
    answerEn: 'Each listing remains active for 30 days. After 25 days or upon expiration, you can renew it free of charge directly from the "My Listings" tab in your user dashboard.',
  },

  // Deals & Safety
  {
    category: 'deal',
    questionBn: 'বিক্রেতাকে কি অগ্রিম টাকা পাঠানো যাবে?',
    answerBn: 'কখনোই না! বেচা-কেনা কঠোরভাবে "হাতে হাতে পণ্য পরীক্ষা ও ক্যাশ লেনদেন" নীতি অনুসরণ করে। কোনো অবস্থাতেই পণ্য হাতে পাওয়ার আগে কুরিয়ার ভাড়া বা বুকিং মানি পাঠাবেন না।',
    questionEn: 'Can I send advance payment to a seller?',
    answerEn: 'Never! Becha-Kena strictly enforces an "in-person inspection and cash-on-hand" policy. Under no circumstances should you send courier charges or booking money before receiving and testing the item.',
  },
  {
    category: 'deal',
    questionBn: 'যদি কোনো বিক্রেতা অগ্রিম টাকা দাবি করে তাহলে কি করব?',
    answerBn: 'চ্যাট অপশনে থাকা "রিপোর্ট" (Report) বাটনে ক্লিক করে সাথে সাথে আমাদের জানান। আমাদের অটোমেটেড সিস্টেম অগ্রিম টাকা চাওয়ার কি-ওয়ার্ড শনাক্ত করে সন্দেহভাজন একাউন্ট সাময়িকভাবে সাসপেন্ড করে।',
    questionEn: 'What should I do if a seller demands advance money?',
    answerEn: 'Click the "Report" button inside the chat immediately. Our automated system detects advance payment keywords and suspends suspicious accounts automatically.',
  },

  // Account
  {
    category: 'account',
    questionBn: 'আমি কি আমার মোবাইল নম্বর পরিবর্তন করতে পারি?',
    answerBn: 'যেহেতু আপনার মোবাইল নম্বর এবং NID সরাসরি লিংক করা থাকে, তাই নিরাপত্তা বজায় রাখার জন্য মোবাইল নম্বর পরিবর্তনের ক্ষেত্রে গ্রাহক সেবা (Helpline) টিমে পরিচয় নিশ্চিত করে রিকোয়েস্ট পাঠাতে হয়।',
    questionEn: 'Can I change my registered phone number?',
    answerEn: 'Because your phone number is securely tied to your government NID, changing your number requires contacting our helpline support to re-verify identity.',
  },
  {
    category: 'account',
    questionBn: 'পাসওয়ার্ড ভুলে গেলে কিভাবে পুনরুদ্ধার করব?',
    answerBn: 'লগইন পেজে "পাসওয়ার্ড ভুলে গেছেন?" অপশনে ক্লিক করে আপনার নিবন্ধিত মোবাইল নম্বরে ওটিপি (OTP) কোড পাঠিয়ে মাত্র ১ মিনিটে নতুন পাসওয়ার্ড সেট করে নিতে পারেন।',
    questionEn: 'How do I recover a forgotten password?',
    answerEn: 'Click "Forgot Password" on the login screen, enter your phone number to receive an instant OTP, and set a new secure password in less than a minute.',
  },
];

export default function FaqPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  const categories: { key: FaqCategoryKey; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: isEn ? 'All Questions' : 'সকল জিজ্ঞাসা', icon: <HelpCircle className="w-4 h-4" /> },
    { key: 'kyc', label: isEn ? 'NID Verification' : 'NID ভেরিফিকেশন', icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'listing', label: isEn ? 'Ads & Listings' : 'বিজ্ঞাপন পোস্ট ও রিনিউ', icon: <PlusCircle className="w-4 h-4" /> },
    { key: 'deal', label: isEn ? 'Safe Trading' : 'লেনদেন ও নিরাপত্তা', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'account', label: isEn ? 'Account & Settings' : 'অ্যাকাউন্ট ও সেটিংস', icon: <Lock className="w-4 h-4" /> },
  ];

  const [activeCategory, setActiveCategory] = useState<FaqCategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const q = isEn ? faq.questionEn : faq.questionBn;
    const a = isEn ? faq.answerEn : faq.answerBn;
    const matchesSearch =
      q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? 'Knowledge Base & FAQ' : 'নলেজ বেস ও সহায়তা কেন্দ্র'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Frequently Asked Questions (FAQ)' : 'সাধারণ জিজ্ঞাসা (FAQ)'}
          </h1>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isEn
              ? 'Find quick, straightforward answers regarding NID verification, posting ads, safe trading, and accounts.'
              : 'NID ভেরিফিকেশন, বিজ্ঞাপন পোস্ট, লেনদেনের নিরাপত্তা ও অ্যাকাউন্ট সম্পর্কিত সর্বাধিক প্রচলিত প্রশ্নের উত্তর।'}
          </p>

          {/* Search Bar */}
          <div className="max-w-lg mx-auto relative pt-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
            <input
              type="text"
              placeholder={isEn ? 'Search questions (e.g. verification, ads, advance fee)...' : 'আপনার প্রশ্ন লিখে সার্চ করুন (যেমন: ভেরিফিকেশন, বিজ্ঞাপন, কুরিয়ার)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key);
                setOpenIndex(null);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                activeCategory === cat.key
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {isEn ? faq.questionEn : faq.questionBn}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      {isEn ? faq.answerEn : faq.answerBn}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <p className="text-sm font-bold text-slate-700">
                {isEn ? 'No questions found' : 'কোনো প্রশ্নোত্তর পাওয়া যায়নি'}
              </p>
              <p className="text-xs text-slate-400">
                {isEn ? 'Try searching with different keywords.' : 'অন্য কোনো কি-ওয়ার্ড দিয়ে আবার চেষ্টা করুন।'}
              </p>
            </div>
          )}
        </div>

        {/* Still Need Help CTA */}
        <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50 border border-emerald-200 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-emerald-950">
              {isEn ? 'Could not find your answer?' : 'আপনার প্রশ্নের সমাধান খুঁজে পাননি?'}
            </h3>
            <p className="text-xs text-emerald-800">
              {isEn ? 'Our support team is ready to answer any queries.' : 'আমাদের সাপোর্ট টিম আপনার যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত রয়েছে।'}
            </p>
          </div>
          <Link
            href="/contact"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isEn ? 'Contact Support' : 'সাপোর্টে যোগাযোগ করুন'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
