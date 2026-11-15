'use client';

import React, { useState } from 'react';
import { Upload, Scale, AlertTriangle } from 'lucide-react';
import { uploadApi } from '@/lib/api/upload.api';
import { disputeApi } from '@/lib/api/dispute.api';
import toast from 'react-hot-toast';

interface DisputeFormProps {
  dealId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function DisputeForm({ dealId, onSuccess, onCancel }: DisputeFormProps) {
  const [gdNumber, setGdNumber] = useState('');
  const [thana, setThana] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [gdDocumentKey, setGdDocumentKey] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingDoc(true);
      const presignedRes = await uploadApi.getPresignedUrl({
        context: 'gd_document',
        fileName: file.name,
        fileType: file.type || 'image/jpeg',
        fileSize: file.size,
      });

      const { uploadUrl, objectKey } = presignedRes.data.data;

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      await uploadApi.confirmUpload(objectKey, 'gd_document');
      setGdDocumentKey(objectKey);
      toast.success('জিডি কপি আপলোড সম্পন্ন হয়েছে');
    } catch {
      toast.error('জিডি ফাইল আপলোড ব্যর্থ হয়েছে');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdNumber.trim() || !thana.trim() || !filingDate || !gdDocumentKey) {
      toast.error('জিডি সংক্রান্ত সকল তথ্য ও প্রমাণক প্রদান করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      await disputeApi.createDispute(dealId, {
        gdNumber: gdNumber.trim(),
        thana: thana.trim(),
        filingDate,
        gdDocumentKey,
      });

      toast.success('অভিযোগ সফলভাবে দায়ের হয়েছে। বিক্রেতার একাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে।');
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'অভিযোগ দায়ের ব্যর্থ হয়েছে';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white border border-red-200 space-y-4">
      <div className="flex items-center gap-2 text-red-600 border-b border-red-100 pb-3">
        <Scale className="w-5 h-5" />
        <h3 className="text-base font-bold text-slate-900">
          ⚖️ চুরি যাওয়া পণ্যের অভিযোগ (File Stolen Item Dispute)
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">জিডি নম্বর (GD / FIR Number)</label>
          <input
            type="text"
            required
            placeholder="যেমন: GD-2026-1234"
            value={gdNumber}
            onChange={(e) => setGdNumber(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">থানার নাম (Police Station Name)</label>
          <input
            type="text"
            required
            placeholder="যেমন: গুলশান থানা"
            value={thana}
            onChange={(e) => setThana(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">জিডি দায়েরের তারিখ (GD Filing Date)</label>
        <input
          type="date"
          required
          max={new Date().toISOString().split('T')[0]}
          value={filingDate}
          onChange={(e) => setFilingDate(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
        />
      </div>

      {/* GD Document Upload */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          অফিসিয়াল জিডি ডকুমেন্টের কপি (GD Document Photo)
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50">
          {gdDocumentKey ? (
            <p className="text-xs font-bold text-emerald-700">✓ জিডি কপি সফলভাবে আপলোড হয়েছে</p>
          ) : (
            <label className="cursor-pointer flex flex-col items-center">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-600">
                {isUploadingDoc ? 'আপলোড হচ্ছে...' : 'ছবি নির্বাচন করতে ক্লিক করুন'}
              </span>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2 text-xs text-red-900 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <span>
          ⚠️ সতর্কতা: মিথ্যা অভিযোগ দায়ের করলে আপনার একাউন্ট বন্ধ এবং আইনগত ব্যবস্থা নেওয়া হতে পারে।
        </span>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !gdDocumentKey}
          className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
        >
          {isSubmitting ? 'দায়ের হচ্ছে...' : 'অভিযোগ দায়ের করুন (File Dispute) →'}
        </button>
      </div>
    </form>
  );
}

