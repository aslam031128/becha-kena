'use client';

import React, { useState, useEffect, use } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import { userApi } from '@/lib/api/user.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { PublicUserProfile } from '@/lib/types/user.types';
import { Listing } from '@/lib/types/listing.types';
import { Review } from '@/lib/types/deal.types';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Package,
  Star,
  Calendar,
  Ban,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface AdminUserProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default function AdminUserProfilePage({ params }: AdminUserProfilePageProps) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;

  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dual Approval State
  const [isBanProposed, setIsBanProposed] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isProposingBan, setIsProposingBan] = useState(false);
  const [isConfirmingBan, setIsConfirmingBan] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [profileRes, reviewsRes] = await Promise.all([
          userApi.getPublicProfile(userId).catch(() => null),
          userApi.getUserReviews(userId).catch(() => null),
        ]);

        if (profileRes?.data?.data) {
          setProfile(profileRes.data.data);
        }

        if (reviewsRes?.data?.data) {
          setReviews(reviewsRes.data.data);
        }

        // Fetch user listings
        const listingsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/listings?sellerId=${userId}`
        );
        if (listingsRes.ok) {
          const json = await listingsRes.json();
          setListings(json.data || []);
        }
      } catch {
        toast.error('Failed to load user moderation data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [userId]);

  // Step 1: Propose Ban (Moderator)
  const handleProposeBan = async () => {
    if (banReason.trim().length < 5) {
      toast.error('Ban reason must be at least 5 characters');
      return;
    }
    try {
      setIsProposingBan(true);
      await adminApi.proposeBan(userId, banReason.trim());
      setIsBanProposed(true);
      toast.success('Ban proposal recorded! Awaiting Super Admin confirmation.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Failed to propose ban';
      toast.error(msg);
    } finally {
      setIsProposingBan(false);
    }
  };

  // Step 2: Confirm Ban (Super Admin)
  const handleConfirmBan = async () => {
    try {
      setIsConfirmingBan(true);
      await adminApi.confirmBan(userId);
      setIsBanned(true);
      toast.success('Citizen permanently banned. NID blacklisted and listings archived.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Failed to confirm ban';
      toast.error(msg);
    } finally {
      setIsConfirmingBan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded-sm" />
        <div className="h-44 bg-slate-900 rounded-2xl border border-slate-800" />
        <div className="h-64 bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              Citizen Moderation Dossier
            </h1>
            <p className="text-xs font-mono text-slate-400">
              User ID: {userId}
            </p>
          </div>
        </div>

        {isBanned && (
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5">
            <Ban className="w-4 h-4" />
            <span>PERMANENTLY TERMINATED</span>
          </span>
        )}
      </div>

      {/* User Overview Profile Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-slate-800 text-slate-200 font-extrabold text-3xl flex items-center justify-center border border-slate-700">
          {profile?.displayName?.charAt(0) || 'U'}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-lg font-bold text-white">
              {profile?.displayName || 'Unknown Citizen'}
            </h2>
            {profile?.isNidVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>NID Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Unverified Citizen</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <strong className="text-white">
                {profile?.averageRating ? profile.averageRating.toFixed(1) : 'New'}
              </strong>
              <span>({reviews.length} reviews)</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>{profile?.totalDealsCompleted || 0} Deals Completed</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Joined:{' '}
                {profile?.memberSince
                  ? new Date(profile.memberSince).toLocaleDateString()
                  : 'N/A'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* DUAL-APPROVAL BAN WORKFLOW PANEL */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-400" />
            <span>Dual-Approval Permanent Ban Workflow</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            To prevent abuse, permanent citizen termination requires a two-person consensus: a Moderator proposes the ban with legal justification, and a Super Admin confirms the cryptographic blacklist.
          </p>
        </div>

        {/* Approval Chain Progress Indicator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step 1: Moderator Proposal */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isBanProposed || isBanned
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step 1 · Moderator Action
              </span>
              {isBanProposed || isBanned ? (
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700" />
              )}
            </div>
            <h4 className="text-xs font-bold text-white">Propose Permanent Ban</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Requires justification (5-200 chars). Restricts active listings.
            </p>
          </div>

          {/* Step 2: Super Admin Confirmation */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isBanned
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step 2 · Super Admin Confirmation
              </span>
              {isBanned ? (
                <CheckCircle2 className="w-4 h-4 text-red-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>
            <h4 className="text-xs font-bold text-white">Cryptographic Blacklist</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Bans NID hash, phone, and terminates all active sessions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {!isBanned && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            {!isBanProposed ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Step 1: Enter Ban Justification (Moderator / Admin):
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="State confirmed violation (e.g., Stolen iPhone serial match, police GD-2026-1234)..."
                  className="w-full p-3 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-red-500 resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {banReason.length}/200 characters (min 5)
                  </span>
                  <button
                    onClick={handleProposeBan}
                    disabled={isProposingBan || banReason.trim().length < 5}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    {isProposingBan ? 'Recording...' : 'Propose Ban (Step 1) →'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  ⚠️ <strong>Ban Proposed:</strong> A moderator has proposed permanent termination for this user. Super Admin confirmation is now unlocked.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleConfirmBan}
                    disabled={isConfirmingBan || !isSuperAdmin}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg disabled:opacity-40 transition-colors flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    <span>
                      {isConfirmingBan
                        ? 'Blacklisting...'
                        : isSuperAdmin
                        ? 'Confirm Permanent Ban (Step 2)'
                        : 'Super Admin Access Required for Step 2'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User's Listings Activity */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400" />
          <span>Active & Historical Listings ({listings.length})</span>
        </h3>

        {listings.length === 0 ? (
          <p className="text-xs text-slate-500">No listings found for this citizen.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {listings.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <Link
                    href={`/listing/${item.id}`}
                    target="_blank"
                    className="font-bold text-white hover:text-emerald-400 transition-colors"
                  >
                    {item.title}
                  </Link>
                  <p className="text-slate-400 text-[11px]">
                    ৳{item.price.toLocaleString()} · {item.category} · Status:{' '}
                    <span className="text-emerald-400 uppercase font-semibold">
                      {item.status}
                    </span>
                  </p>
                </div>

                <Link
                  href={`/listing/${item.id}`}
                  target="_blank"
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  View Ad
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

