'use client';

import React from 'react';

export function NewsletterSignup() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
    >
      <input
        type="tel"
        placeholder="+880 1XXXXXXXXX"
        className="flex-1 px-4 py-3 rounded-full bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      <button
        type="submit"
        className="px-6 py-3 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm transition-colors shadow-sm"
      >
        Subscribe (যুক্ত হন)
      </button>
    </form>
  );
}

