'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin portal error:', error);
  }, [error]);

  return (
    <div className="p-10 rounded-2xl bg-slate-900 border border-red-500/30 text-center max-w-lg mx-auto my-12 space-y-4">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
        <AlertOctagon className="w-6 h-6" />
      </div>

      <h2 className="text-base font-bold text-white">
        Moderation Console Exception
      </h2>
      <p className="text-xs text-slate-400 leading-relaxed">
        An error occurred while communicating with the administrative RPC gateway.
      </p>

      <div className="pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retry Operation</span>
        </button>
      </div>
    </div>
  );
}

