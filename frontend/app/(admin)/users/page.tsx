'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, ArrowRight, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersDirectoryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchTerm.trim();
    if (!clean) {
      toast.error('Please enter a User ID or Phone Number');
      return;
    }
    router.push(`/admin/users/${clean}`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold text-white">
            User Moderation Directory
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Search citizen dossier to inspect account history, KYC logs, or initiate dual-approval sanctions.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Citizen Lookup by User ID or Phone Number:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 671ff89e492b49b38c... or 01712345678"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <span>Open Citizen Dossier</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200 block mb-1">Dual-Approval Ban Notice:</strong>
            All permanent bans executed through the dossier are recorded in an immutable cryptographic blacklist that prevents any future registration with the same NID number, SIM card, or hardware device.
          </div>
        </div>
      </div>
    </div>
  );
}
