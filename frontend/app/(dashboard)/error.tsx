'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="p-12 rounded-3xl bg-white border border-red-200 text-center max-w-xl mx-auto my-8 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h2 className="text-lg font-bold text-slate-900">
        ড্যাশবোর্ড তথ্য লোড করা যায়নি (Dashboard Error)
      </h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        সার্ভারের সাথে সংযোগ স্থাপনে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।
      </p>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>পুনরায় চেষ্টা করুন (Retry)</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>হোমপেজে যান</span>
        </Link>
      </div>
    </div>
  );
}

