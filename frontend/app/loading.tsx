import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <div className="relative flex items-center justify-center">
        {/* Animated outer ring */}
        <div className="w-20 h-20 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        
        {/* Inner pulsing logo icon */}
        <div className="absolute flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xl shadow-lg animate-pulse">
            BK
          </div>
        </div>
      </div>
      
      <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">
        লোডিং হচ্ছে... (Loading...)
      </p>
    </div>
  );
}

