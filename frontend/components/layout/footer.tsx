'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, AlertTriangle, Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageModal } from './language-modal';

export function Footer() {
  const { t, currentLanguage } = useTranslation();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const f = t.footer;
  const c = t.categories;

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
      {/* Trust Pillars Banner */}
      <div className="border-b border-slate-800 bg-slate-950/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {f.nidTitle}
                </h4>
                <p className="text-xs text-slate-400">
                  {f.nidDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {f.safeTitle}
                </h4>
                <p className="text-xs text-slate-400">
                  {f.safeDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {f.stolenTitle}
                </h4>
                <p className="text-xs text-slate-400">
                  {f.stolenDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              {f.categoriesCol}
            </h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/categories/electronics" className="hover:text-emerald-400 transition-colors">{c.electronics}</Link></li>
              <li><Link href="/categories/vehicles" className="hover:text-emerald-400 transition-colors">{c.vehicles}</Link></li>
              <li><Link href="/categories/property" className="hover:text-emerald-400 transition-colors">{c.property}</Link></li>
              <li><Link href="/categories/fashion" className="hover:text-emerald-400 transition-colors">{c.fashion}</Link></li>
              <li><Link href="/categories/home" className="hover:text-emerald-400 transition-colors">{c.home}</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              {f.helpCol}
            </h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/safety-tips" className="hover:text-emerald-400 transition-colors">{f.safeTips}</Link></li>
              <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">{f.faq}</Link></li>
              <li><Link href="/verification-guide" className="hover:text-emerald-400 transition-colors">{f.verificationGuide}</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">{f.helpline}</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              {f.companyCol}
            </h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/about" className="hover:text-emerald-400 transition-colors">{f.about}</Link></li>
              <li><Link href="/careers" className="hover:text-emerald-400 transition-colors">{f.careers}</Link></li>
              <li><Link href="/press" className="hover:text-emerald-400 transition-colors">{f.press}</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              {f.legalCol}
            </h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">{f.terms}</Link></li>
              <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">{f.privacy}</Link></li>
              <li><Link href="/dispute-policy" className="hover:text-emerald-400 transition-colors">{f.dispute}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{f.rights}</p>

          {/* Language Selection Trigger */}
          <button
            onClick={() => setIsLanguageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all text-xs active:scale-95 cursor-pointer"
            title={`${f.languageLabel}: ${currentLanguage.name}`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{f.languageLabel}: {currentLanguage.flag} {currentLanguage.name}</span>
          </button>
        </div>
      </div>

      <LanguageModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />
    </footer>
  );
}
