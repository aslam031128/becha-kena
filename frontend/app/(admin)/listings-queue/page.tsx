'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { adminApi, AdminListingQueueItem } from '@/lib/api/admin.api';
import { resolveMediaUrl } from '@/lib/utils/media';
import {
  PackageCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  Phone,
  MapPin,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminListingsQueuePage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [queue, setQueue] = useState<AdminListingQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalItem, setRejectModalItem] = useState<AdminListingQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Preview Details Modal
  const [selectedItem, setSelectedItem] = useState<AdminListingQueueItem | null>(null);

  const fetchQueue = async (status: string) => {
    try {
      setIsLoading(true);
      const res = await adminApi.getListingQueue({ status });
      if (res.data?.success && res.data.data) {
        setQueue(res.data.data);
      }
    } catch {
      toast.error('বিজ্ঞাপন তালিকা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(activeTab);
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    try {
      setActioningId(id);
      await adminApi.approveListing(id);
      toast.success('বিজ্ঞাপন সফলভাবে অনুমোদন করা হয়েছে এবং সাইটে লাইভ হয়েছে!');
      setQueue((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'অনুমোদন ব্যর্থ হয়েছে';
      toast.error(msg);
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem) return;

    try {
      setIsRejecting(true);
      await adminApi.rejectListing(rejectModalItem.id, rejectReason.trim());
      toast.success('বিজ্ঞাপন বাতিল করা হয়েছে');
      setQueue((prev) => prev.filter((item) => item.id !== rejectModalItem.id));
      setRejectModalItem(null);
      setRejectReason('');
      if (selectedItem?.id === rejectModalItem.id) setSelectedItem(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'বাতিল করতে ব্যর্থ হয়েছে';
      toast.error(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-emerald-600" />
            <span>বিজ্ঞাপন অনুমোদন কিউ (Ad Moderation Queue)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            নতুন বিজ্ঞাপনের সত্যতা ও নিয়মাবলী যাচাই করে প্রকাশ বা বাতিল করুন
          </p>
        </div>

        <button
          onClick={() => fetchQueue(activeTab)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>রিফ্রেশ (Refresh)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'pending'
              ? 'border-amber-600 text-amber-700 bg-amber-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>অনুমোদনাধীন (Pending Review)</span>
          {activeTab === 'pending' && queue.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px]">
              {queue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'approved'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>অনুমোদিত (Approved Ads)</span>
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'rejected'
              ? 'border-red-600 text-red-700 bg-red-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>বাতিলকৃত (Rejected Ads)</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs text-slate-400 font-medium">বিজ্ঞাপন লোড হচ্ছে...</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">কোনো বিজ্ঞাপন অপেক্ষারত নেই</h3>
          <p className="text-xs text-slate-500">
            {activeTab === 'pending'
              ? 'সব বিজ্ঞাপন যাচাই সম্পন্ন হয়েছে!'
              : 'এই ট্যাবে কোনো বিজ্ঞাপন খুঁজে পাওয়া যায়নি।'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
            >
              {/* Left Column: Image & Details */}
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="relative w-24 h-24 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                  <Image
                    src={resolveMediaUrl(item.imageUrls?.[0])}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                  {item.imageUrls?.length > 1 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                      +{item.imageUrls.length - 1}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        item.moderationStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : item.moderationStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.moderationStatus}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                      {item.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                      {item.condition?.replace('_', ' ')}
                    </span>
                    {item.location && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>
                          {item.location.thana ? `${item.location.thana}, ` : ''}
                          {item.location.division}
                        </span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 truncate">{item.title}</h3>

                  <div className="text-base font-extrabold text-emerald-700">
                    ৳ {item.price?.toLocaleString()}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 max-w-xl">
                    {item.description}
                  </p>

                  {/* Seller Info */}
                  {item.seller && (
                    <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 border-t border-slate-100">
                      <span className="font-semibold text-slate-800">
                        বিক্রেতা: {item.seller.displayName || 'Citizen'}
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.seller.phone}</span>
                      </span>
                      {item.seller.isNidVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>NID Verified</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold text-[11px]">
                          ⚠️ Unverified
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        পোস্ট: {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>বিস্তারিত দেখুন</span>
                </button>

                {activeTab === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={actioningId === item.id}
                      onClick={() => handleApprove(item.id)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{actioningId === item.id ? 'অনুমোদন হচ্ছে...' : 'অনুমোদন করুন'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={actioningId === item.id}
                      onClick={() => setRejectModalItem(item)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>বাতিল করুন</span>
                    </button>
                  </>
                )}

                {activeTab === 'rejected' && (
                  <button
                    type="button"
                    disabled={actioningId === item.id}
                    onClick={() => handleApprove(item.id)}
                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>পুনরায় অনুমোদন</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
            <button
              onClick={() => setRejectModalItem(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">বিজ্ঞাপন বাতিল করুন (Reject Ad)</h3>
            <p className="text-xs text-slate-500 mb-4">
              &quot;{rejectModalItem.title}&quot; বিজ্ঞাপনটি বাতিল করার কারণ উল্লেখ করুন:
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="যেমন: পণ্যের ছবি অস্পষ্ট, অনুপযুক্ত বিষয়বস্তু, অথবা তথ্যে গরমিল রয়েছে..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white resize-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isRejecting ? 'বাতিল হচ্ছে...' : 'বাতিল নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                {selectedItem.moderationStatus}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedItem.title}</h2>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">
                ৳ {selectedItem.price?.toLocaleString()}
              </div>
            </div>

            {/* Photo Gallery Grid */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">
                আপলোডকৃত ছবি ({selectedItem.imageUrls?.length || 0} টি):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedItem.imageUrls?.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
                  >
                    <Image
                      src={resolveMediaUrl(url)}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Full Description */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-1">বিস্তারিত বিবরণ:</h4>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                {selectedItem.description}
              </p>
            </div>

            {/* Seller Card */}
            {selectedItem.seller && (
              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {selectedItem.seller.displayName}
                  </p>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    ফোন: {selectedItem.seller.phone}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    যোগদান: {new Date(selectedItem.seller.memberSince).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  {selectedItem.seller.isNidVerified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>NID Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      <span>⚠️ Unverified</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold flex-1"
              >
                বন্ধ করুন
              </button>
              {selectedItem.moderationStatus === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalItem(selectedItem);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex-1"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedItem.id)}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex-1 shadow-sm"
                  >
                    অনুমোদন করুন
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

