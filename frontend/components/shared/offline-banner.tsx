'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2 text-center text-xs font-semibold shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top duration-200">
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <span>
        কোনো ইন্টারনেট সংযোগ নেই (No internet connection) · ডেটা সংরক্ষিত ক্যাশ থেকে প্রদর্শিত হতে পারে।
      </span>
    </div>
  );
}

