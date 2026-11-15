'use client';

import { useEffect, useState } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl font-bold mb-6 border border-red-100 shadow-sm">
        ⚠️
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Something went wrong
      </h1>
      <p className="text-slate-600 max-w-md mb-6 text-sm">
        কিছু একটা সমস্যা হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।
      </p>

      <div className="flex gap-4 items-center">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors shadow-sm"
        >
          Try Again (আবার চেষ্টা করুন)
        </button>

        {process.env.NODE_ENV !== 'production' && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {showDetails && error && (
        <pre className="mt-6 p-4 bg-slate-900 text-red-400 text-left rounded-lg text-xs max-w-xl overflow-x-auto border border-slate-800">
          {error.stack || error.message}
        </pre>
      )}
    </div>
  );
}

