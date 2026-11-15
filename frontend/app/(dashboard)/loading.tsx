import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-5xl animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-md" />
          <div className="h-3 w-64 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded-sm" />
            <div className="h-8 w-32 bg-slate-200 rounded-md" />
          </div>
        ))}
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded-sm" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-50 border border-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

