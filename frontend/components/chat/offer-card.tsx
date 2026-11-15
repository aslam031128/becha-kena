'use client';

import React from 'react';
import { Tag, Clock, Check, X, RotateCcw } from 'lucide-react';
import { Offer } from '@/lib/types/offer.types';
import { useCountdown } from '@/lib/hooks/use-countdown';

interface OfferCardProps {
  offer: Offer;
  currentUserId: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onCounter?: () => void;
}

export function OfferCard({
  offer,
  currentUserId,
  onAccept,
  onDecline,
  onCounter,
}: OfferCardProps) {
  const { hours, minutes, seconds, isExpired } = useCountdown(offer.expiresAt);

  const isMyOffer = offer.offeredBy === (offer.buyerId === currentUserId ? 'buyer' : 'seller');
  const canRespond = !isMyOffer && offer.status === 'pending' && !isExpired;

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    countered: 'bg-blue-100 text-blue-800 border-blue-200',
    declined: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <div className="my-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm max-w-sm mx-auto space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span>প্রস্তাবনা (Round {offer.roundNumber}/3)</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
            statusColors[offer.status] || 'bg-slate-100 text-slate-700'
          }`}
        >
          {isExpired && offer.status === 'pending' ? 'Expired' : offer.status}
        </span>
      </div>

      <div className="text-center py-1">
        <span className="text-xs text-slate-400 font-medium">প্রস্তাবিত মূল্য</span>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          ৳ {offer.amount.toLocaleString()}
        </div>
      </div>

      {offer.status === 'pending' && !isExpired && (
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
          <span>
            মেয়াদ বাকি: {hours}:{minutes}:{seconds}
          </span>
        </div>
      )}

      {canRespond && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {onAccept && (
            <button
              onClick={onAccept}
              className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>গ্রহণ</span>
            </button>
          )}

          {onCounter && offer.roundNumber < 3 && (
            <button
              onClick={onCounter}
              className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>পাল্টা দর</span>
            </button>
          )}

          {onDecline && (
            <button
              onClick={onDecline}
              className="py-2 px-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>বাতিল</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

