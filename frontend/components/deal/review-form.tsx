'use client';

import React, { useState } from 'react';
import { StarRating } from '@/components/ui/star-rating';
import { TrustBadge } from '@/lib/types/deal.types';
import { reviewApi } from '@/lib/api/review.api';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  dealId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const trustBadgeOptions: { key: TrustBadge; label: string; icon: string }[] = [
  { key: 'punctual', label: 'সময়নিষ্ঠ (Punctual)', icon: '⏱️' },
  { key: 'item_as_described', label: 'বিবরণ অনুযায়ী (Item as Described)', icon: '✅' },
  { key: 'friendly_communication', label: 'বন্ধুসুলভ (Friendly Communication)', icon: '💬' },
  { key: 'quick_payment', label: 'দ্রুত পেমেন্ট (Quick Payment)', icon: '💳' },
];

export function ReviewForm({ dealId, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<TrustBadge[]>(['item_as_described']);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleBadge = (badge: TrustBadge) => {
    setTags((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await reviewApi.createReview({
        dealId,
        rating,
        tags,
        comment: comment.trim() || undefined,
      });

      if (res.data.success) {
        toast.success('✅ রিভিউ সফলভাবে জমা হয়েছে! (Review submitted successfully!)');
        onSuccess();
      }
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { error?: { code?: string; message?: string } } } })?.response?.data?.error;
      if (errorData?.code === 'ALREADY_REVIEWED') {
        toast.error('আপনি ইতিমধ্যে এই ডিলের জন্য রিভিউ দিয়েছেন। (Already reviewed)');
      } else if (errorData?.code === 'REVIEW_WINDOW_EXPIRED') {
        toast.error('রিভিউ দেওয়ার সময়সীমা শেষ হয়ে গেছে (৪৮ ঘণ্টা)। (Review window expired)');
      } else {
        toast.error(errorData?.message || 'রিভিউ জমা দেওয়া সম্ভব হয়নি');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white border border-slate-200 space-y-5">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900">⭐ রিভিউ দিন (Leave a Review)</h3>
        <p className="text-xs text-slate-500">আপনার লেনদেনের অভিজ্ঞতা রেটিং ও ব্যাজের মাধ্যমে প্রকাশ করুন</p>
      </div>

      {/* Star Rating Input */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">রেটিং (Rating):</label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      {/* Trust Badges Checkbox Options */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">
          ট্রাস্ট ব্যাজ (Trust Badges - প্রযোজ্যগুলো নির্বাচন করুন):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {trustBadgeOptions.map((item) => (
            <label
              key={item.key}
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-semibold transition-all ${
                tags.includes(item.key)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={tags.includes(item.key)}
                onChange={() => toggleBadge(item.key)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          মন্তব্য (ঐচ্ছিক / Optional Comment):
        </label>
        <textarea
          rows={3}
          maxLength={500}
          placeholder="অন্যান্য ব্যবহারকারীদের জন্য বিক্রেতা/ক্রেতা সম্পর্কে কিছু লিখুন..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
        >
          {isSubmitting ? 'জমা হচ্ছে...' : 'জমা দিন (Submit Review) →'}
        </button>
      </div>
    </form>
  );
}

