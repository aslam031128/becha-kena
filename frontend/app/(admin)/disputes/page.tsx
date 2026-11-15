'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, AdminDisputeItem } from '@/lib/api/admin.api';
import { uploadApi } from '@/lib/api/upload.api';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  Scale,
  CheckCircle2,
  RefreshCw,
  Eye,
  X,
  ExternalLink,
  Lock,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDisputesPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const [disputes, setDisputes] = useState<AdminDisputeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningDisputeId, setActioningDisputeId] = useState<string | null>(null);

  // Document Preview Modal
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  // Resolve Modal
  const [resolveModalDispute, setResolveModalDispute] = useState<AdminDisputeItem | null>(null);
  const [resolutionChoice, setResolutionChoice] = useState<'seller_banned' | 'claim_dismissed' | 'legal_hold'>('seller_banned');
  const [isResolving, setIsResolving] = useState(false);

  const fetchDisputes = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getDisputes();
      if (res.data?.success && res.data.data) {
        setDisputes(res.data.data);
      }
    } catch {
      toast.error('Failed to load legal disputes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleOpenPreview = async (urlOrKey: string) => {
    if (!urlOrKey) {
      toast.error('GD document file not attached');
      return;
    }

    if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
      setPreviewDocUrl(urlOrKey);
      return;
    }

    try {
      setIsLoadingDoc(true);
      const res = await uploadApi.getPrivateUrl(urlOrKey);
      if (res.data?.success && res.data.data?.downloadUrl) {
        setPreviewDocUrl(res.data.data.downloadUrl);
      } else {
        toast.error('Could not generate private document URL');
      }
    } catch {
      toast.error('Error fetching encrypted GD document');
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolveModalDispute) return;
    try {
      setIsResolving(true);
      setActioningDisputeId(resolveModalDispute.disputeId);
      await adminApi.resolveDispute(resolveModalDispute.disputeId, resolutionChoice);
      toast.success(`Dispute resolved with action: ${resolutionChoice}`);
      setResolveModalDispute(null);
      fetchDisputes();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Failed to resolve dispute';
      toast.error(msg);
    } finally {
      setIsResolving(false);
      setActioningDisputeId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Scale className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Legal Dispute Resolution Panel
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {disputes.length} disputes
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Police General Diary (GD / FIR) Stolen Item claims with statutory seller asset freeze.
          </p>
        </div>

        <button
          onClick={fetchDisputes}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {!isSuperAdmin && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You are logged in as <strong>Moderator</strong>. You may inspect evidence; only a <strong>Super Admin</strong> can execute permanent resolution judgments.
          </span>
        </div>
      )}

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse space-y-4"
            >
              <div className="h-5 w-48 bg-slate-800 rounded-sm" />
              <div className="h-4 w-72 bg-slate-800 rounded-sm" />
              <div className="h-24 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-slate-200">No active police disputes</h3>
          <p className="text-xs text-slate-500 mt-1">
            There are currently no contested stolen property disputes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const isProcessing = actioningDisputeId === dispute.disputeId;

            return (
              <div
                key={dispute.disputeId}
                className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-5"
              >
                {/* Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">
                          GD #{dispute.gdNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {dispute.thanaName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Filing Date: {new Date(dispute.gdFilingDate).toLocaleDateString()} · Status:{' '}
                        <span className="font-semibold text-amber-400 capitalize">
                          {dispute.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Submitted: {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Parties Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Complainant (Buyer / Victim)
                    </span>
                    <p className="text-slate-200 font-bold">
                      {dispute.buyer?.displayName || 'Citizen'}
                    </p>
                    <p className="text-slate-400 font-mono text-[11px]">
                      {dispute.buyer?.phone || 'No phone'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Accused Party (Seller under freeze)
                    </span>
                    <p className="text-slate-200 font-bold">
                      {dispute.seller?.displayName || 'Seller'}
                    </p>
                    <p className="text-slate-400 font-mono text-[11px]">
                      {dispute.seller?.phone || 'No phone'}
                    </p>
                  </div>
                </div>

                {/* Evidence & Action Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenPreview(dispute.gdDocumentUrl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Inspect Police GD Document Photo</span>
                  </button>

                  {dispute.status === 'resolved' || dispute.resolutionAction ? (
                    <span className="text-xs text-emerald-400 font-semibold">
                      ✓ Resolved: {dispute.resolutionAction}
                    </span>
                  ) : (
                    <button
                      onClick={() => setResolveModalDispute(dispute)}
                      disabled={isProcessing || !isSuperAdmin}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
                    >
                      <Scale className="w-4 h-4" />
                      <span>Execute Legal Resolution →</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Decision Modal (Super Admin) */}
      {resolveModalDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-red-400">
                <Scale className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Execute Legal Resolution</h3>
              </div>
              <button
                onClick={() => setResolveModalDispute(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select official determination for GD #{resolveModalDispute.gdNumber}:
            </p>

            <div className="space-y-2.5">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                  resolutionChoice === 'seller_banned'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="resolutionAction"
                  value="seller_banned"
                  checked={resolutionChoice === 'seller_banned'}
                  onChange={() => setResolutionChoice('seller_banned')}
                  className="mt-0.5 text-red-500 focus:ring-red-400"
                />
                <div>
                  <span className="font-bold block">Seller Banned (Permanent Ban)</span>
                  <span className="text-[11px] text-slate-400">
                    Confirms stolen goods. Permanently blacklists seller NID, phone & terminates all ads.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                  resolutionChoice === 'claim_dismissed'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="resolutionAction"
                  value="claim_dismissed"
                  checked={resolutionChoice === 'claim_dismissed'}
                  onChange={() => setResolutionChoice('claim_dismissed')}
                  className="mt-0.5 text-emerald-500 focus:ring-emerald-400"
                />
                <div>
                  <span className="font-bold block">Claim Dismissed (Unfreeze Seller)</span>
                  <span className="text-[11px] text-slate-400">
                    GD found false or unsubstantiated. Removes account freeze from seller.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                  resolutionChoice === 'legal_hold'
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="resolutionAction"
                  value="legal_hold"
                  checked={resolutionChoice === 'legal_hold'}
                  onChange={() => setResolutionChoice('legal_hold')}
                  className="mt-0.5 text-blue-500 focus:ring-blue-400"
                />
                <div>
                  <span className="font-bold block">Legal Hold (Escalate to Police)</span>
                  <span className="text-[11px] text-slate-400">
                    Maintains freeze while formal law enforcement investigation proceeds.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button
                onClick={() => setResolveModalDispute(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                disabled={isResolving}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {isResolving ? 'Executing Judgment...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GD Document Preview Modal */}
      {(previewDocUrl || isLoadingDoc) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
            <button
              onClick={() => setPreviewDocUrl(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              <span>Official Police General Diary (GD) Document</span>
            </h3>

            <div className="w-full h-80 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
              {isLoadingDoc ? (
                <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading GD certificate...</span>
                </div>
              ) : previewDocUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDocUrl}
                  alt="Police GD Evidence"
                  className="max-h-full max-w-full object-contain"
                />
              ) : null}
            </div>

            <div className="mt-3 flex justify-between items-center text-[11px] text-slate-500">
              <span>Verified police evidence file</span>
              {previewDocUrl && (
                <a
                  href={previewDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-400 hover:underline flex items-center gap-1"
                >
                  <span>Open Full Size</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
