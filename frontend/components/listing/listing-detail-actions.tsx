'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Heart, Flag, ShieldCheck, Star } from 'lucide-react';
import { Listing } from '@/lib/types/listing.types';
import { useAuth } from '@/lib/hooks/use-auth';
import { useUIStore } from '@/lib/store/ui.store';
import { PhoneRevealButton } from '@/components/listing/phone-reveal-button';
import { ReportModal } from '@/components/report/report-modal';
import { chatApi } from '@/lib/api/chat.api';
import { favoriteApi } from '@/lib/api/favorite.api';
import toast from 'react-hot-toast';

interface ListingDetailActionsProps {
  listing: Listing;
}

export function ListingDetailActions({ listing }: ListingDetailActionsProps) {
  const { user, isAuthenticated } = useAuth();
  const { openKycModal } = useUIStore();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const router = useRouter();

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/listing/${listing.id}`);
      return;
    }
    if (!user?.isNidVerified) {
      openKycModal();
      return;
    }

    try {
      setIsStartingChat(true);
      const res = await chatApi.startConversation(listing.id);
      if (res.data.success && res.data.data) {
        const convoId = res.data.data.id || res.data.data.conversationId;
        if (convoId) {
          router.push(`/chat/${convoId}`);
        } else {
          toast.error('চ্যাট আইডি পাওয়া যায়নি');
        }
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'চ্যাট শুরু করা সম্ভব হয়নি';
      toast.error(msg);
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/listing/${listing.id}`);
      return;
    }
    try {
      if (isFavorited) {
        await favoriteApi.removeFavorite(listing.id);
        setIsFavorited(false);
        toast.success('ফেভারিট থেকে সরানো হয়েছে');
      } else {
        await favoriteApi.addFavorite(listing.id);
        setIsFavorited(true);
        toast.success('ফেভারিটে যুক্ত করা হয়েছে');
      }
    } catch {
      toast.error('সমস্যা হয়েছে, পুনরায় চেষ্টা করুন');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Actions Row */}
      <div className="flex flex-wrap items-center gap-3">
        <PhoneRevealButton listingId={listing.id} />

        <button
          onClick={handleStartChat}
          disabled={isStartingChat}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide transition-all shadow-xs active:scale-95 disabled:opacity-50"
        >
          {isStartingChat ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <MessageSquare className="w-4 h-4" />
              <span>চ্যাট করুন (Chat Now)</span>
            </>
          )}
        </button>

        <button
          onClick={handleToggleFavorite}
          aria-label="Save Listing"
          className={`p-2.5 rounded-xl border border-slate-200 transition-colors ${isFavorited ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500' : ''}`} />
        </button>

        <button
          onClick={() => setIsReportOpen(true)}
          aria-label="Report Listing"
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:bg-slate-50 transition-colors"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {/* Seller Summary Box */}
      {listing.seller && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base">
                {listing.seller.displayName?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{listing.seller.displayName}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-slate-700">
                    {listing.seller.averageRating > 0 ? listing.seller.averageRating.toFixed(1) : 'New'}
                  </span>
                  <span>({listing.seller.totalDealsCompleted} deals)</span>
                </div>
              </div>
            </div>

            {listing.seller.isNidVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>NID Verified</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Safety Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        entityType="listing"
        entityId={listing.id}
      />
    </div>
  );
}

