import React from 'react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
      {/* Top Branding */}
      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            BK
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            Becha<span className="text-emerald-600">-Kena</span>
          </span>
        </Link>
        <p className="text-xs text-slate-500 mt-1">
          Bangladesh’s First NID-Verified Resale Platform
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        {children}
      </div>

      {/* Back to Home Link */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-emerald-600 font-medium transition-colors"
        >
          ← হোমে ফিরে যান (Back to Homepage)
        </Link>
      </div>
    </div>
  );
}

