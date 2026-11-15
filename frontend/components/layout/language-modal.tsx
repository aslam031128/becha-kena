'use client';

import React, { useState } from 'react';
import { X, Check, Globe, Search } from 'lucide-react';
import { useTranslation, Locale } from '@/lib/i18n/context';
import { TOP_LANGUAGES, Language } from '@/lib/i18n/languages';
import toast from 'react-hot-toast';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { locale, setLocale } = useTranslation();
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredLanguages = TOP_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.englishName.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (lang: Language) => {
    setLocale(lang.code as Locale);
    toast.success(`Language changed to ${lang.name} (${lang.englishName})`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                ভাষা নির্বাচন করুন (Select Language)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                বিশ্বের সেরা ১০টি প্রধান ভাষা (Top 10 World Languages)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search language / ভাষা খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Languages Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] divide-y divide-slate-100 space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredLanguages.map((lang) => {
              const isSelected = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0" role="img" aria-label={lang.englishName}>
                      {lang.flag}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-emerald-950' : 'text-slate-900'}`}>
                        {lang.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lang.englishName}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {filteredLanguages.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              কোনো ভাষা পাওয়া যায়নি (No language matched)
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>ডিফল্ট ভাষা: বাংলা (Bengali)</span>
          <button
            onClick={() => handleSelect(TOP_LANGUAGES[0])}
            className="text-emerald-700 font-bold hover:underline"
          >
            বাংলায় রিসেট করুন
          </button>
        </div>
      </div>
    </div>
  );
}

