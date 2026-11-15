'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, Users, Scale, AlertOctagon, FileCheck, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin');
      } else if (user?.role !== 'moderator' && user?.role !== 'super_admin') {
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== 'moderator' && user?.role !== 'super_admin')) {
    return null;
  }

  const adminNav = [
    { label: 'KYC Queue', labelBn: 'কেওয়াইসি কিউ', href: '/admin/kyc-queue', icon: FileCheck },
    { label: 'Reports Triage', labelBn: 'রিপোর্ট ট্রায়াজ', href: '/admin/reports', icon: AlertOctagon },
    { label: 'Legal Disputes', labelBn: 'আইনি বিরোধ', href: '/admin/disputes', icon: Scale },
    { label: 'Phone Audits', labelBn: 'ফোন রিভিল অডিট', href: '/admin/audits', icon: ShieldAlert },
    { label: 'User Control', labelBn: 'ইউজার ম্যানেজমেন্ট', href: '/admin/users', icon: Users },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Dark Admin Dedicated Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-sm">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Becha-Kena Admin</h1>
            <p className="text-[10px] text-emerald-400 capitalize">{user?.role} Portal</p>
          </div>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-medium text-xs">{item.labelBn}</span>
                  <span className="text-[10px] text-slate-400">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Site</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/40">
          <h2 className="text-sm font-semibold text-slate-200">Moderation Back-Office</h2>
          <span className="text-xs text-slate-400">{user?.displayName || user?.phone}</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

