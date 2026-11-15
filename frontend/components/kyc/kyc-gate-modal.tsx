'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';

interface KycGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KycGateModal({ isOpen, onClose }: KycGateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          NID ভেরিফিকেশন প্রয়োজন
        </h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Becha-Kena-তে বিজ্ঞাপন পোস্ট করতে বা অন্যান্য বিশ্বস্ত সুবিধা উপভোগ করতে আপনার জাতীয় পরিচয়পত্র (NID) দিয়ে একাউন্ট ভেরিফাই করুন।
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/kyc"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            ভেরিফিকেশন শুরু করুন (Verify Now) →
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            পরে করব (Not Now)
          </button>
        </div>
      </div>
    </div>
  );
}

