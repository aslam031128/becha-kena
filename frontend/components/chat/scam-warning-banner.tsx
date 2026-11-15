import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ScamWarningBanner() {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-red-50 border-l-4 border-red-500 flex items-start gap-3 text-red-900 animate-slide-up shadow-2xs">
      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xs font-bold">
          ⚠️ সতর্কতা: পণ্য সশরীরে যাচাই করার আগে কখনো bKash, Nagad বা অন্য কোনো মাধ্যমে অগ্রিম টাকা পাঠাবেন না।
        </p>
        <p className="text-[11px] text-red-700 leading-relaxed">
          WARNING: Never send advance money via bKash/Nagad before physically verifying the product.
        </p>
      </div>
    </div>
  );
}

