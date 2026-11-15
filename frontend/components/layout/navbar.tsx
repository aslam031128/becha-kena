'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  PlusCircle,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Package,
  Tag,
  Settings,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useUIStore } from '@/lib/store/ui.store';
import { NotificationBell } from '@/components/notification/notification-bell';
import { SearchBar } from './search-bar';
import { KycGateModal } from '@/components/kyc/kyc-gate-modal';
import { LanguageModal } from './language-modal';
import { useTranslation } from '@/lib/i18n/context';

const categories = [
  { name: 'Electronics', nameBn: 'ইলেকট্রনিক্স', icon: '📱', slug: 'electronics' },
  { name: 'Vehicles', nameBn: 'যানবাহন', icon: '🚗', slug: 'vehicles' },
  { name: 'Property', nameBn: 'সম্পত্তি', icon: '🏠', slug: 'property' },
  { name: 'Fashion', nameBn: 'ফ্যাশন', icon: '👗', slug: 'fashion' },
  { name: 'Home & Living', nameBn: 'গৃহসজ্জা', icon: '🏡', slug: 'home' },
  { name: 'Hobbies', nameBn: 'শখের পণ্য', icon: '🎮', slug: 'hobbies' },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isKycModalOpen, openKycModal, closeKycModal } = useUIStore();
  const { currentLanguage, t } = useTranslation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const router = useRouter();

  const handlePostAd = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/listings/new');
      return;
    }
    if (!user?.isNidVerified) {
      openKycModal();
      return;
    }
    router.push('/listings/new');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Navbar Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
              BK
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                Becha<span className="text-emerald-600">-Kena</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                NID VERIFIED C2C
              </span>
            </div>
          </Link>

          {/* Search Bar - Hidden on mobile, full width on desktop */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <SearchBar />
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Language Selection Trigger */}
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-bold text-xs transition-all shadow-2xs flex-shrink-0 active:scale-95"
              title="ভাষা পরিবর্তন / Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs flex items-center gap-1">
                <span className="text-sm leading-none">{currentLanguage.flag}</span>
                <span className="hidden sm:inline font-semibold">{currentLanguage.name}</span>
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Favorites Heart - hidden on small mobile to give space to Post Ad */}
            <Link
              href="/favorites"
              aria-label="Favorites"
              className="hidden sm:flex p-2 text-slate-600 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Notification Bell */}
            <div className="flex-shrink-0">
              <NotificationBell />
            </div>

            {/* Post Ad Button - High visibility & never squished */}
            <button
              onClick={handlePostAd}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[11px] sm:text-xs tracking-wide transition-all shadow-md shadow-emerald-600/30 ring-1 ring-emerald-300/40 active:scale-95 flex-shrink-0 whitespace-nowrap cursor-pointer hover:shadow-lg hover:shadow-emerald-600/40"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-white" />
              <span className="whitespace-nowrap font-extrabold">{t.common.postAd || 'বিজ্ঞাপন দিন'}</span>
            </button>

            {/* Auth Dropdown / Sign In CTA */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs overflow-hidden">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />
                    )}
                  </div>
                  {user.isNidVerified && (
                    <ShieldCheck className="w-4 h-4 text-emerald-500 -ml-2" />
                  )}
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {user.displayName || user.phone}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">Role: {user.role}</p>
                    </div>

                    {(user.role === 'super_admin' || user.role === 'moderator') && (
                      <>
                        <Link
                          href="/admin/users"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>{t.nav.adminPanel}</span>
                        </Link>
                        <Link
                          href="/admin/listings-queue"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50/80 hover:bg-amber-100/80 transition-colors border-b border-slate-100"
                        >
                          <Package className="w-4 h-4 text-amber-600" />
                          <span>{t.nav.adQueue}</span>
                        </Link>
                      </>
                    )}

                    <Link
                      href="/profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>{t.nav.profile}</span>
                    </Link>

                    <Link
                      href="/listings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>{t.nav.myListings}</span>
                    </Link>

                    <Link
                      href="/deals"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Tag className="w-4 h-4 text-slate-400" />
                      <span>{t.nav.deals}</span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>{t.nav.settings}</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.nav.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                {t.common.signIn}
              </Link>
            )}
          </div>
        </div>

        {/* Search Bar - Mobile View Only */}
        <div className="block md:hidden pb-3">
          <SearchBar />
        </div>
      </div>

      {/* Category Navigation Bar (Horizontal Scroll) */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-2.5 overflow-x-auto no-scrollbar scroll-smooth text-xs">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 font-medium whitespace-nowrap transition-all shadow-2xs"
              >
                <span>{cat.icon}</span>
                <span>{t.categories[cat.slug as keyof typeof t.categories] || cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KYC Gate Modal for Unverified User Post Attempt */}
      <KycGateModal isOpen={isKycModalOpen} onClose={closeKycModal} />

      {/* Top 10 World Languages Selection Modal */}
      <LanguageModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} />
    </header>
  );
}

