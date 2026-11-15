'use client';

import React, { useState } from 'react';
import { Flag, X, AlertCircle } from 'lucide-react';
import { ReportEntityType, ReportReason, reportApi } from '@/lib/api/report.api';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ReportEntityType;
  entityId: string;
}

const reportReasons: { label: string; enLabel: string; value: ReportReason }[] = [
  {
    label: 'অগ্রিম টাকা দাবি',
    enLabel: 'Advance payment scam',
    value: 'scam_advance_demanded',
  },
  {
    label: 'চুরি যাওয়া পণ্য সন্দেহ',
    enLabel: 'Stolen goods suspected',
    value: 'stolen_goods_suspected',
  },
  {
    label: 'হয়রানি বা অসদাচরণ',
    enLabel: 'Harassment or abuse',
    value: 'harassment',
  },
  {
    label: 'নকল বা জাল পণ্য',
    enLabel: 'Counterfeit product',
    value: 'counterfeit',
  },
  {
    label: 'স্প্যাম বা ভুয়া পোস্ট',
    enLabel: 'Spam or fake listing',
    value: 'spam',
  },
];

export function ReportModal({
  isOpen,
  onClose,
  entityType,
  entityId,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('scam_advance_demanded');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedDetails = details.trim();
    if (trimmedDetails.length < 5) {
      setValidationError('অনুগ্রহ করে অন্তত ৫ অক্ষরের বিবরণ প্রদান করুন (Min 5 characters required)');
      return;
    }
    if (trimmedDetails.length > 500) {
      setValidationError('বিবরণ সর্বোচ্চ ৫০০ অক্ষরের মধ্যে হতে হবে (Max 500 characters)');
      return;
    }

    try {
      setIsSubmitting(true);
      await reportApi.createReport({
        entityType,
        entityId,
        reason,
        details: trimmedDetails,
      });

      toast.success('✅ Report submitted. Our team will review it. (রিপোর্ট সফলভাবে জমা হয়েছে)');
      setDetails('');
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            error?: {
              code?: string;
              message?: string;
            };
          };
        };
      };

      if (
        axiosErr?.response?.status === 409 ||
        axiosErr?.response?.data?.error?.code === 'ALREADY_REPORTED'
      ) {
        toast.error('You have already reported this item. (আপনি ইতিমধ্যে এই আইটেমটি রিপোর্ট করেছেন)');
      } else {
        const errorMsg =
          axiosErr?.response?.data?.error?.message ||
          'রিপোর্ট জমা দেওয়া সম্ভব হয়নি। অনুগ্রহ করে পরে আবার চেষ্টা করুন।';
        toast.error(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-red-600 mb-4 pb-2 border-b border-red-50">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <Flag className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              রিপোর্ট করুন (Report {entityType})
            </h3>
            <p className="text-xs text-slate-500">
              কমিউনিটি সুরক্ষায় আমাদের সাহায্য করুন
            </p>
          </div>
        </div>

        {validationError && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2">
              কারণ নির্বাচন করুন (Select Reason):
            </label>
            <div className="space-y-2">
              {reportReasons.map((item) => (
                <label
                  key={item.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-colors ${
                    reason === item.value
                      ? 'border-red-500 bg-red-50/50 text-red-950 ring-1 ring-red-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-[11px] text-slate-500">{item.enLabel}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-800">
                বিস্তারিত বিবরণ (Details):
              </label>
              <span className="text-[10px] text-slate-400">
                {details.length}/500
              </span>
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="অভিযোগের বিশদ কারণ বা প্রমাণ সম্পর্কে লিখুন (কমপক্ষে ৫ অক্ষর)..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none transition-all"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isSubmitting ? (
                'জমা হচ্ছে...'
              ) : (
                <>
                  <span>Submit Report</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
