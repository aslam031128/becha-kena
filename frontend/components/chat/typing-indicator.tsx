import React from 'react';

export function TypingIndicator({ userName = 'Counterpart' }: { userName?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 py-1 px-3 bg-slate-100 rounded-full w-fit animate-pulse">
      <div className="flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-[11px] font-medium">{userName} লিখছেন...</span>
    </div>
  );
}

