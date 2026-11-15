'use client';

import React from 'react';
import Link from 'next/link';
import { Scale, PhoneCall } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function DisputePolicyPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  const steps = [
    {
      num: '1',
      title: isEn ? 'File a Dispute Claim' : 'অভিযোগ বা ডিসপিউট উত্থাপন (File a Dispute)',
      desc: isEn
        ? 'If a significant undisclosed defect or fraudulent condition is found after a deal, file a dispute from your "My Deals" dashboard or contact our support center.'
        : 'কোনো ডিল সম্পন্ন করার পর পণ্যে বড় ধরনের গোপন ত্রুটি বা জালিয়াতি পাওয়া গেলে ড্যাশবোর্ডের "আমার ডিল" পৃষ্ঠা থেকে অথবা সাপোর্ট সেন্টারে সরাসরি অভিযোগ দাখিল করুন।',
    },
    {
      num: '2',
      title: isEn ? 'Evidence Review & Chat Audit' : 'উভয় পক্ষের প্রমাণ সংগ্রহ ও পর্যালোচনা',
      desc: isEn
        ? 'Our dispute team inspects chat timestamps, original listing details, photos, IMEI numbers, and purchase receipts submitted by both parties.'
        : 'আমাদের ডিসপিউট টিম ক্রেতা ও বিক্রেতা উভয় পক্ষের চ্যাট হিস্ট্রি, অরিজিনাল বিজ্ঞাপনের বিবরণ, আইএমইআই/রিসিট এবং পণ্যের ভিডিও প্রমাণ যাচাই করবে।',
    },
    {
      num: '3',
      title: isEn ? 'Formal Mediation & Resolution' : 'মধ্যস্থতা ও মীমাংসা (Mediation & Settlement)',
      desc: isEn
        ? 'Upon finding merit, the seller is directed to accept product return or arrange compensation under monitored mediation.'
        : 'অভিযোগের সত্যতা সাপেক্ষে বিক্রেতাকে পণ্য ফেরত নিয়ে অর্থ প্রত্যর্পণ (Refund) অথবা পারস্পরিক বোঝাপড়ার মাধ্যমে সমাধান করার আনুষ্ঠানিক নির্দেশনা দেওয়া হয়।',
    },
    {
      num: '4',
      title: isEn ? 'Legal Escalation & NID Blacklisting' : 'আইনগত ব্যবস্থা ও NID ব্ল্যাকলিস্টিং',
      desc: isEn
        ? 'Deliberate fraud leads to permanent NID blacklisting across Becha-Kena and provision of certified digital audit records for Bangladesh Police General Diary (GD) proceedings.'
        : 'যদি কোনো পক্ষ ইচ্ছাকৃত প্রতারণা করে এবং নির্দেশ অমান্য করে, তবে তার NID ও ফোন নম্বর প্ল্যাটফর্মে চিরতরে ব্ল্যাকলিস্ট করা হয় এবং ভুক্তভোগীকে পুলিশি সাধারণ ডায়েরি (GD) করার জন্য অফিশিয়াল অডিট কপি সরবরাহ করা হয়।',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? 'Fairness & Dispute Resolution' : 'ন্যায্য বিচার ও বিরোধ নিষ্পত্তি'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Dispute Resolution Policy' : 'বিরোধ নিষ্পত্তি নীতিমালা (Dispute Resolution Policy)'}
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            {isEn
              ? 'Our dispute resolution framework ensures fair arbitration and accountability for every transaction conducted on Becha-Kena.'
              : 'বেচা-কেনা প্ল্যাটফর্মে প্রতিটি লেনদেনে ন্যায়বিচার ও পারস্পরিক আস্থা নিশ্চিত করতে আমাদের সুনির্দিষ্ট অভিযোগ প্রতিকার ও বিরোধ নিষ্পত্তি ফ্রেমওয়ার্ক।'}
          </p>
        </div>

        {/* 4-Step Resolution Process */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isEn ? '4-Stage Dispute Settlement Process' : '৪-ধাপে বিরোধ নিষ্পত্তি প্রক্রিয়া'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative overflow-hidden"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                  {s.num}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Guidelines for Police General Diary (GD) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">
            {isEn ? 'Police General Diary (GD) & Stolen Item Recovery' : 'পুলিশ সাধারণ ডায়েরি (GD) ও চুরি যাওয়া পণ্য উদ্ধার'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {isEn
              ? 'If you discover that your stolen phone or device has been listed on Becha-Kena, file a General Diary (GD) at your local police station and upload the verified GD copy through our support center. We freeze the listing immediately and provide the registered seller’s verified NID details directly to investigating police officers upon legal request.'
              : 'যদি আপনি নিশ্চিত হন যে আপনার চুরি যাওয়া কোনো পণ্য বা ডিভাইস বেচা-কেনা প্ল্যাটফর্মে বিজ্ঞাপন আকারে পোস্ট করা হয়েছে, তবে অবিলম্বে আপনার স্থানীয় থানায় একটি জিডি (GD) করুন এবং জিডির কপি আমাদের সাপোর্টে পাঠান। আমরা তাৎক্ষণিকভাবে বিজ্ঞাপনটি ফ্রিজ করব এবং পুলিশি তলবের ভিত্তিতে বিক্রেতার ভেরিফাইড NID তথ্য তদন্তকারী কর্মকর্তার কাছে হস্তান্তর করব।'}
          </p>
        </div>

        {/* CTA Contact */}
        <div className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold">
              {isEn ? 'Need Assistance with an Active Deal?' : 'চলতি কোনো লেনদেনে সমস্যায় পড়েছেন?'}
            </h4>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'Contact our dispute resolution and legal support team directly.'
                : 'আমাদের বিরোধ নিষ্পত্তি অফিসারদের সাথে সরাসরি কথা বলুন।'}
            </p>
          </div>
          <Link
            href="/contact"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{isEn ? 'Contact Dispute Officer' : 'সাপোর্টে কল করুন'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
