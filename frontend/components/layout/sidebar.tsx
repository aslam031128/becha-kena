'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Heart,
  Tag,
  User,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useChatStore } from '@/lib/store/chat.store';
import { useNotificationStore } from '@/lib/store/notification.store';
import { useUIStore } from '@/lib/store/ui.store';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { conversations } = useChatStore();
  const { unreadCount: unreadNotifications } = useNotificationStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  const totalUnreadChat = conversations.reduce(
    (acc, curr) => acc + (curr.unreadCount || 0),
    0
  );

  const mainNavLinks = [
    { label: 'Dashboard', labelBn: 'ড্যাশবোর্ড', href: '/listings', icon: LayoutDashboard },
    { label: 'My Listings', labelBn: 'আমার বিজ্ঞাপন', href: '/listings', icon: Package },
    {
      label: 'Messages',
      labelBn: 'বার্তা',
      href: '/chat',
      icon: MessageSquare,
      badge: totalUnreadChat,
    },
    {
      label: 'Notifications',
      labelBn: 'নোটিফিকেশন',
      href: '/notifications',
      icon: Bell,
      badge: unreadNotifications,
    },
    { label: 'Favorites', labelBn: 'সংরক্ষিত', href: '/favorites', icon: Heart },
    { label: 'Deals', labelBn: 'আমার ডিল', href: '/deals', icon: Tag },
  ];

  const secondaryNavLinks = [
    { label: 'Profile', labelBn: 'প্রোফাইল', href: '/profile', icon: User },
    { label: 'Settings', labelBn: 'সেটিংস', href: '/profile', icon: Settings },
  ];

  const isAdmin = user?.role === 'super_admin' || user?.role === 'moderator';

  return (
    <>
      {/* Mobile Backdrop Drawer Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-sm">
              BK
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              Becha<span className="text-emerald-600">-Kena</span>
            </span>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Mini Profile Card */}
        {user && (
          <div className="p-3.5 mx-4 my-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.displayName || user.phone}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-medium">
                  {user.isNidVerified ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      <span>NID Verified</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <span>⚠️ Unverified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!user.isNidVerified && (
              <Link
                href="/kyc"
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[11px] font-bold shadow-xs transition-all active:scale-[0.98]"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>NID ভেরিফাই করুন ➔</span>
              </Link>
            )}
          </div>
        )}

        {/* Navigation Section */}
        <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              মেন্যু (Menu)
            </span>
            <nav className="mt-2 space-y-1">
              {!user?.isNidVerified && (
                <Link
                  href="/kyc"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors mb-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🛡️</span>
                    <span>এনআইডি ভেরিফিকেশন (Verify NID)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold">
                    আবশ্যক
                  </span>
                </Link>
              )}
              {mainNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${isActive
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{item.labelBn}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin Panel Link - Only for super_admin/moderator */}
          {isAdmin && (
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                অ্যাডমিন (Admin)
              </span>
              <nav className="mt-2 space-y-1">
                <Link
                  href="/admin/users"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${pathname === '/admin/users'
                      ? 'bg-amber-50 text-amber-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${pathname.startsWith('/admin') ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>ইউজার ম্যানেজমেন্ট (User Control)</span>
                </Link>
                <Link
                  href="/admin/kyc-queue"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${pathname === '/admin/kyc-queue'
                      ? 'bg-amber-50 text-amber-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${pathname === '/admin/kyc-queue' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>কেওয়াইসি কিউ (KYC Queue)</span>
                </Link>
                <Link
                  href="/admin/listings-queue"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${pathname === '/admin/listings-queue'
                      ? 'bg-amber-50 text-amber-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <Package className={`w-4 h-4 ${pathname === '/admin/listings-queue' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>বিজ্ঞাপন অনুমোদন (Ad Queue)</span>
                </Link>
              </nav>
            </div>
          )}

          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              অ্যাকাউন্ট (Account)
            </span>
            <nav className="mt-2 space-y-1">
              {secondaryNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${isActive
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{item.labelBn}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Logout Footer */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => {
              setSidebarOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>লগআউট (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
}

