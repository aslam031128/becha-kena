'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Sparkles, TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { ListingCard } from '@/components/listing/listing-card';
import { Listing } from '@/lib/types/listing.types';
import { NewsletterSignup } from '@/components/home/newsletter-signup';
import { useTranslation } from '@/lib/i18n/context';

interface HomeContentProps {
  recentListings: Listing[];
  popularListings: Listing[];
}

export function HomeContent({ recentListings, popularListings }: HomeContentProps) {
  const { t } = useTranslation();
  const h = t.home;
  const c = t.categories;

  const categoryList = [
    { name: c.electronics, icon: '📱', slug: 'electronics' },
    { name: c.vehicles, icon: '🚗', slug: 'vehicles' },
    { name: c.property, icon: '🏠', slug: 'property' },
    { name: c.fashion, icon: '👗', slug: 'fashion' },
    { name: c.home, icon: '🏡', slug: 'home' },
    { name: c.hobbies, icon: '🎮', slug: 'hobbies' },
  ];

  return (
    <div className="flex flex-col gap-12 sm:gap-16 pb-12">
      {/* SECTION 1: Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 animate-pulse">
            <ShieldCheck className="w-4 h-4" />
            <span>{h.heroBadge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
            {h.heroTitle} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              {h.heroTitleGradient}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            {h.heroSubtitle}
          </p>

          {/* Trust Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 text-xs font-medium text-slate-300">
            <span className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80">
              {h.verifiedPill}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80">
              {h.scamProtectionPill}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80">
              {h.productsPill}
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <span>{h.browseNow}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm transition-colors"
            >
              <span>{h.postFreeAd}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2: Shop by Category */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {h.categoriesTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {h.categoriesSubtitle}
            </p>
          </div>
          <Link
            href="/search"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>{t.common.viewAll}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {categoryList.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-emerald-50 flex items-center justify-center text-2xl transition-colors mb-2">
                {cat.icon}
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 text-center">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3: Featured / Recently Listed */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {h.justAddedTitle}
            </h2>
          </div>
          <Link
            href="/search?sort=newest"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>{t.common.viewAll}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentListings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 text-slate-400 text-sm">
            {h.noListings}
          </div>
        )}
      </section>

      {/* SECTION 4: Popular Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {h.popularTitle}
            </h2>
          </div>
          <Link
            href="/search?sort=price_high"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>{t.common.viewAll}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {popularListings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {popularListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 text-slate-400 text-sm">
            {h.stayTuned}
          </div>
        )}
      </section>

      {/* SECTION 5: Trust & Safety Banner */}
      <section className="bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {h.threeGuaranteesTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {h.threeGuaranteesSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-white mb-2">
                {h.pillar1Title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {h.pillar1Desc}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-white mb-2">
                {h.pillar2Title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {h.pillar2Desc}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Award className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-white mb-2">
                {h.pillar3Title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {h.pillar3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Newsletter / Subscription CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-900/10">
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-3">
            {h.newsletterTitle}
          </h3>
          <p className="text-sm text-emerald-100 max-w-xl mx-auto mb-6">
            {h.newsletterSubtitle}
          </p>

          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}
