'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, AdminKycQueueItem } from '@/lib/api/admin.api';
import { uploadApi } from '@/lib/api/upload.api';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  X,
  Eye,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminKycQueuePage() {
  const [queue, setQueue] = useState<AdminKycQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalUser, setRejectModalUser] = useState<AdminKycQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Preview Image Modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getKycQueue();
      if (res.data?.success && res.data.data) {
        setQueue(res.data.data);
      }
    } catch {
      toast.error('Failed to load KYC queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      setActioningUserId(userId);
      await adminApi.approveKyc(userId);
      toast.success('Citizen identity approved successfully');
      setQueue((prev) => prev.filter((item) => item.userId !== userId));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Approval failed';
      toast.error(msg);
    } finally {
      setActioningUserId(null);
    }
  };

  const handleOpenReject = (user: AdminKycQueueItem) => {
    setRejectModalUser(user);
    setRejectReason('Photos are blurry or cropped. Please retake.');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalUser) return;
    try {
      setIsRejecting(true);
      await adminApi.rejectKyc(rejectModalUser.userId, rejectReason);
      toast.success('KYC application rejected. Retake requested.');
      setQueue((prev) => prev.filter((item) => item.userId !== rejectModalUser.userId));
      setRejectModalUser(null);
    } catch {
      toast.error('Failed to reject KYC application');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleViewPrivateImage = async (key?: string) => {
    if (!key) {
      toast.error('Document key not available');
      return;
    }
    try {
      setIsLoadingPreview(true);
      const res = await uploadApi.getPrivateUrl(key);
      if (res.data?.success && res.data.data?.downloadUrl) {
        setPreviewImageUrl(res.data.data.downloadUrl);
      } else {
        toast.error('Unable to generate secure preview URL');
      }
    } catch {
      toast.error('Error fetching secure document');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Helper for SLA badge
  const getSlaInfo = (agingHours: number, slaStatus: string) => {
    const hoursLeft = Math.max(0, 4 - agingHours);
    const minutesLeft = Math.round((hoursLeft % 1) * 60);
    const wholeHours = Math.floor(hoursLeft);

    if (slaStatus === 'breached' || agingHours >= 4) {
      return {
        badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
        text: `🔴 Breached (+${(agingHours - 4).toFixed(1)}h over)`,
      };
    }
    if (slaStatus === 'warning' || agingHours >= 2) {
      return {
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        text: `🟡 SLA: ${wholeHours}h ${minutesLeft}m left`,
      };
    }
    return {
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      text: `🟢 SLA: ${wholeHours}h ${minutesLeft}m left`,
    };
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white">
              KYC Manual Review Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {queue.length} pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manual Citizen Verification Queue with SLA aging monitoring (Target: &lt;4h turnaround)
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Queue List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse space-y-4"
            >
              <div className="h-5 w-48 bg-slate-800 rounded-sm" />
              <div className="h-4 w-72 bg-slate-800 rounded-sm" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-24 bg-slate-800 rounded-xl" />
                <div className="h-24 bg-slate-800 rounded-xl" />
                <div className="h-24 bg-slate-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">KYC Queue is Clear!</h3>
          <p className="text-xs text-slate-500 mt-1">
            All submitted citizens have been processed within SLA targets.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => {
            const sla = getSlaInfo(item.slaAgingHours, item.slaStatus);
            const isProcessing = actioningUserId === item.userId;

            return (
              <div
                key={item.userId}
                className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-5"
              >
                {/* Entry Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                      {item.displayName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {item.displayName || 'Unnamed Citizen'}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {item.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Submitted: {new Date(item.submittedAt).toLocaleTimeString()}</span>
                        </span>
                        <span>·</span>
                        <span className="text-amber-400 font-medium">
                          {item.kycAttempts} attempts
                        </span>
                      </div>
                      {item.nidNumber && (
                        <div className="text-[11px] text-emerald-400 font-mono mt-1">
                          NID: {item.nidNumber} {item.dob ? `· DOB: ${item.dob}` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SLA Badge */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${sla.badgeClass}`}
                  >
                    <span>{sla.text}</span>
                  </div>
                </div>

                {/* Secure Image Thumbnails Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Submitted Verification Documents:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* NID Front */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300">NID Front</span>
                        <span className="text-[10px] text-slate-500 uppercase">Document</span>
                      </div>
                      <button
                        onClick={() => handleViewPrivateImage(item.frontImageKey || `nid_front_${item.userId}`)}
                        className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Inspect Image</span>
                      </button>
                    </div>

                    {/* NID Back */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300">NID Back</span>
                        <span className="text-[10px] text-slate-500 uppercase">Document</span>
                      </div>
                      <button
                        onClick={() => handleViewPrivateImage(item.backImageKey || `nid_back_${item.userId}`)}
                        className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Inspect Image</span>
                      </button>
                    </div>

                    {/* Live Selfie */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300">Live Selfie</span>
                        <span className="text-[10px] text-emerald-400 uppercase">Biometric</span>
                      </div>
                      <button
                        onClick={() => handleViewPrivateImage(item.liveSelfieKey || `selfie_${item.userId}`)}
                        className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Inspect Image</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenReject(item)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>

                  <button
                    onClick={() => handleApprove(item.userId)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'Approving...' : 'Approve Citizen Identity'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Reject KYC Application</h3>
              </div>
              <button
                onClick={() => setRejectModalUser(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select or specify rejection reason for citizen{' '}
              <strong className="text-white">{rejectModalUser.phone}</strong>:
            </p>

            <div className="space-y-2">
              {[
                'Photos are blurry or cropped. Please retake.',
                'NID number does not match name / date of birth.',
                'Biometric selfie does not clearly match NID photo.',
                'Document appears manipulated or fraudulent.',
              ].map((reasonOption) => (
                <label
                  key={reasonOption}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 cursor-pointer text-xs text-slate-300"
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={rejectReason === reasonOption}
                    onChange={() => setRejectReason(reasonOption)}
                    className="text-red-500 focus:ring-red-400"
                  />
                  <span>{reasonOption}</span>
                </label>
              ))}
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              placeholder="Or enter custom reason..."
              className="w-full p-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-red-500"
            />

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setRejectModalUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {(previewImageUrl || isLoadingPreview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Decrypted S3 Verification Document</span>
            </h3>

            <div className="w-full h-80 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Generating temporary signed URL...</span>
                </div>
              ) : previewImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewImageUrl}
                  alt="KYC Document Preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : null}
            </div>

            <div className="mt-3 flex justify-between items-center text-[11px] text-slate-500">
              <span>Single-use temporary presigned link (expires in 60s)</span>
              {previewImageUrl && (
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
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

