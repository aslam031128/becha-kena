'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { locale, t } = useTranslation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          locale === 'bn'
            ? 'পণ্য খুঁজুন... (Search products, brands...)'
            : t.common.search || 'Search products, brands...'
        }
        className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-full bg-slate-100 hover:bg-slate-200/80 focus:bg-white border border-transparent focus:border-emerald-500 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
      />
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </form>
  );
}

