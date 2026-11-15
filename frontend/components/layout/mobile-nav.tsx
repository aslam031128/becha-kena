'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat.store';

export function MobileNav() {
  const pathname = usePathname();
  const { conversations } = useChatStore();

  const totalUnreadChat = conversations.reduce(
    (acc, curr) => acc + (curr.unreadCount || 0),
    0
  );

  const navItems = [
    { label: 'Home', labelBn: 'হোম', href: '/', icon: Home },
    { label: 'Search', labelBn: 'সার্চ', href: '/search', icon: Search },
    { label: 'Post', labelBn: 'পোস্ট', href: '/listings/new', icon: PlusCircle, isPrimary: true },
    { label: 'Chat', labelBn: 'চ্যাট', href: '/chat', icon: MessageSquare, badge: totalUnreadChat },
    { label: 'Profile', labelBn: 'প্রোফাইল', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-3 flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 mt-1">
                  {item.labelBn}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 py-1 transition-colors relative ${
                isActive ? 'text-emerald-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.labelBn}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

