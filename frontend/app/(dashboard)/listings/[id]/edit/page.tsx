'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { ListingCategory, ListingCondition } from '@/lib/types/listing.types';
import { ImageUpload } from '@/components/shared/image-upload';
import { LocationPicker } from '@/components/shared/location-picker';
import { listingApi } from '@/lib/api/listing.api';
import toast from 'react-hot-toast';

interface EditListingPageProps {
  params: Promise<{ id: string }>;
}

export default function EditListingPage({ params }: EditListingPageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ListingCategory>('electronics');
  const [condition, setCondition] = useState<ListingCondition>('like_new');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isPhoneHidden, setIsPhoneHidden] = useState(false);
  const [location, setLocation] = useState<{ division: string; district: string; thana: string }>({
    division: '',
    district: '',
    thana: '',
  });

  useEffect(() => {
    async function loadListing() {
      try {
        setIsLoading(true);
        const res = await listingApi.getListingById(id);
        if (res.data.success && res.data.data) {
          const l = res.data.data;
          setTitle(l.title);
          setDescription(l.description);
          setPrice(l.price.toString());
          setCategory(l.category);
          setCondition(l.condition);
          setImageUrls(l.imageUrls || []);
          setIsPhoneHidden(l.isPhoneHidden || false);
          setLocation({
            division: l.location?.division || '',
            district: '',
            thana: l.location?.thana || '',
          });
        }
      } catch {
        toast.error('লিস্টিং তথ্য লোড করতে ব্যর্থ হয়েছে');
      } finally {
        setIsLoading(false);
      }
    }
    loadListing();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price || imageUrls.length === 0) {
      toast.error('প্রয়োজনীয় সকল তথ্য পূরণ করুন');
      return;
    }

    try {
      setIsSaving(true);
      await listingApi.updateListing(id, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        condition,
        imageUrls,
        isPhoneHidden,
        location: {
          division: location.division,
          thana: location.thana,
          coordinates: [90.4125, 23.8103],
        },
      });
      toast.success('বিজ্ঞাপন সফলভাবে আপডেট করা হয়েছে!');
      router.push('/listings');
    } catch {
      toast.error('আপডেট ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-400">লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          onClick={() => router.back()}
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ফিরে যান (Back)</span>
        </button>
        <h1 className="text-lg font-bold text-slate-900">বিজ্ঞাপন সম্পাদনা (Edit Listing)</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">বিজ্ঞাপনের শিরোনাম</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">বিস্তারিত বিবরণ</label>
          <textarea
            rows={5}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">মূল্য (৳)</label>
          <input
            type="number"
            required
            min={50}
            max={2500000}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3.5 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 mb-2">পণ্যের ছবিসমূহ</label>
          <ImageUpload uploadedImages={imageUrls} onChange={setImageUrls} maxImages={8} />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 mb-2">অবস্থান (Location)</label>
          <LocationPicker
            initialDivision={location.division}
            initialThana={location.thana}
            onChange={setLocation}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>পরিবর্তন সংরক্ষণ করুন (Save Changes)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

