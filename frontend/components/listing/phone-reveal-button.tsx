'use client';

import React, { useState } from 'react';
import { Phone, Check, ShieldCheck, Lock, Copy } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useUIStore } from '@/lib/store/ui.store';
import { listingApi } from '@/lib/api/listing.api';
import toast from 'react-hot-toast';

interface PhoneRevealButtonProps {
  listingId: string;
}

export function PhoneRevealButton({ listingId }: PhoneRevealButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const { openKycModal } = useUIStore();
  const [phone, setPhone] = useState<string | null>(null);
  const [revealsRemaining, setRevealsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReveal = async () => {
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    if (!user?.isNidVerified) {
      openKycModal();
      return;
    }

    try {
      setIsLoading(true);
      const res = await listingApi.revealPhone(listingId);
      if (res.data.success && res.data.data) {
        const revealedNumber = res.data.data.phone || res.data.data.sellerPhone;
        if (revealedNumber) {
          setPhone(revealedNumber);
          setRevealsRemaining(res.data.data.revealsRemainingToday);
          toast.success('নম্বর প্রদর্শিত হয়েছে');
        } else {
          toast.error('ফোন নম্বর পাওয়া যায়নি');
        }
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'ফোন নম্বর প্রদর্শন করা সম্ভব হয়নি';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (phone) {
      navigator.clipboard.writeText(phone);
      setCopied(true);
      toast.success('নম্বর কপি করা হয়েছে');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (phone) {
    return (
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-emerald-50 border border-emerald-300">
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide transition-colors"
            title="সরাসরি কল করুন"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{phone}</span>
          </a>
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-800 transition-colors"
            title="নম্বর কপি করুন"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-emerald-600" />
            )}
          </button>
        </div>
        {revealsRemaining !== null && (
          <span className="text-[10px] text-slate-400 text-center">
            আজ বাকি: {revealsRemaining}/10 বার
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleReveal}
      disabled={isLoading}
      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wide transition-colors shadow-sm disabled:opacity-50"
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : !isAuthenticated ? (
        <>
          <Lock className="w-4 h-4 text-slate-400" />
          <span>ফোন নম্বর দেখুন (Sign in to view)</span>
        </>
      ) : !user?.isNidVerified ? (
        <>
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>ফোন নম্বর দেখুন (Verify NID)</span>
        </>
      ) : (
        <>
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>ফোন নম্বর দেখুন (Show Phone)</span>
        </>
      )}
    </button>
  );
}

