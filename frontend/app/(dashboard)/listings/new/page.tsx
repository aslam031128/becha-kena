'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ListingCategory, ListingCondition, CreateListingInput } from '@/lib/types/listing.types';
import { ImageUpload } from '@/components/shared/image-upload';
import { LocationPicker } from '@/components/shared/location-picker';
import { listingApi } from '@/lib/api/listing.api';
import { resolveMediaUrl } from '@/lib/utils/media';
import { useAuth } from '@/lib/hooks/use-auth';
import toast from 'react-hot-toast';

const categories: { key: ListingCategory; label: string; labelBn: string; icon: string }[] = [
  { key: 'electronics', label: 'Electronics', labelBn: 'ইলেকট্রনিক্স', icon: '📱' },
  { key: 'vehicles', label: 'Vehicles', labelBn: 'যানবাহন', icon: '🚗' },
  { key: 'property', label: 'Property', labelBn: 'সম্পত্তি', icon: '🏠' },
  { key: 'fashion', label: 'Fashion', labelBn: 'ফ্যাশন', icon: '👗' },
  { key: 'home', label: 'Home & Living', labelBn: 'গৃহসজ্জা', icon: '🏡' },
  { key: 'hobbies', label: 'Hobbies', labelBn: 'শখের পণ্য', icon: '🎮' },
];

const conditions: { key: ListingCondition; label: string; labelBn: string }[] = [
  { key: 'brand_new', label: 'Brand New', labelBn: 'একদম নতুন' },
  { key: 'like_new', label: 'Like New', labelBn: 'নতুনের মতো' },
  { key: 'gently_used', label: 'Gently Used', labelBn: 'অল্প ব্যবহৃত' },
  { key: 'heavily_used', label: 'Heavily Used', labelBn: 'বেশি ব্যবহৃত' },
];

export default function NewListingPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Multi-step form step: 1: Cat & Condition, 2: Details, 3: Photos, 4: Location, 5: Review & Publish
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [category, setCategory] = useState<ListingCategory>('electronics');
  const [condition, setCondition] = useState<ListingCondition>('like_new');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isPhoneHidden, setIsPhoneHidden] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [location, setLocation] = useState<{ division: string; district: string; thana: string }>({
    division: 'Dhaka',
    district: 'Dhaka',
    thana: 'Gulshan',
  });
  const [coordinates, setCoordinates] = useState<[number, number]>([90.4125, 23.8103]); // [lng, lat]

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use browser geolocation
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates([pos.coords.longitude, pos.coords.latitude]);
          toast.success('বর্তমান অবস্থান পিন করা হয়েছে');
        },
        () => {
          toast.error('লোকেশন অনুমতি পাওয়া যায়নি');
        }
      );
    }
  };

  // Step navigation handlers with descriptive validation
  const handleNextStep2 = () => {
    if (!title.trim()) {
      toast.error('দয়া করে বিজ্ঞাপনের একটি শিরোনাম দিন');
      return;
    }
    if (title.trim().length < 10) {
      toast.error(`শিরোনাম কমপক্ষে ১০ অক্ষরের হতে হবে (বর্তমানে ${title.trim().length}/১০ অক্ষর)`);
      return;
    }
    if (!description.trim()) {
      toast.error('দয়া করে পণ্যের বিস্তারিত বিবরণ দিন');
      return;
    }
    if (description.trim().length < 20) {
      toast.error(`বিবরণ কমপক্ষে ২০ অক্ষরের হতে হবে (বর্তমানে ${description.trim().length}/২০ অক্ষর, আরও ${20 - description.trim().length} অক্ষর লিখুন)`);
      return;
    }
    const numPrice = Number(price);
    if (!price || isNaN(numPrice) || numPrice < 50 || numPrice > 2500000) {
      toast.error('মূল্য ৫০ টাকা থেকে ২৫,০০,০০০ টাকার মধ্যে হতে হবে');
      return;
    }
    setCurrentStep(3);
  };

  const handleNextStep3 = () => {
    if (imageUrls.length === 0) {
      toast.error('বিজ্ঞাপন এগিয়ে নিতে কমপক্ষে ১টি ছবি আপলোড করুন');
      return;
    }
    setCurrentStep(4);
  };

  const handleNextStep4 = () => {
    if (!location.division || !location.thana) {
      toast.error('দয়া করে বিভাগ এবং থানা নির্বাচন করুন');
      return;
    }
    setCurrentStep(5);
  };

  // Submit Listing
  const handlePublish = async () => {
    if (!title.trim() || !description.trim() || !price || imageUrls.length === 0) {
      toast.error('দয়া করে সকল প্রয়োজনীয় তথ্য পূরণ করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateListingInput = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        condition,
        location: {
          division: location.division,
          thana: location.thana,
          coordinates,
        },
        imageUrls,
        videoUrl: videoUrl.trim() || undefined,
        isPhoneHidden,
      };

      const res = await listingApi.createListing(payload);

      if (res.data.success) {
        toast.success('✅ আপনার বিজ্ঞাপন প্রকাশিত হয়েছে! (Listing Published)');
        router.push('/listings');
      }
    } catch (err: unknown) {
      const errorData = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })?.response;
      if (errorData?.status === 422) {
        toast.error('আপনি এই মাসে সর্বোচ্চ ৫টি বিজ্ঞাপন দিতে পারবেন (C2C Quota Exhausted)');
      } else {
        toast.error(errorData?.data?.error?.message || 'বিজ্ঞাপন প্রকাশ ব্যর্থ হয়েছে');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is not NID verified, gate the listing creation page completely
  if (!isAuthLoading && user && !user.isNidVerified) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center animate-slide-up">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200/60 shadow-xs">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              ভেরিফিকেশন প্রয়োজন (Verification Required)
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight pt-2">
              বিজ্ঞাপন পোস্ট করতে NID ভেরিফাই করুন
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Becha-Kena-তে সকল ক্রেতা ও বিক্রেতার নিরাপত্তা নিশ্চিত করতে এবং প্রতারণা রোধে বিজ্ঞাপন পোস্ট করার পূর্বে জাতীয় পরিচয়পত্র (NID) যাচাই করা বাধ্যতামূলক।
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>আপনার পরিচয় সুরক্ষিত থাকবে এবং ক্রেতাদের কাছে ফোন নম্বর গোপন রাখতে পারবেন।</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>প্রোফাইলে <strong>NID Verified</strong> বিশ্বস্ত গ্রিন ব্যাজ যুক্ত হবে।</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>প্রতি মাসে বিনামূল্যে ৫টি বিজ্ঞাপন পোস্ট করতে পারবেন।</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => router.push('/listings')}
              className="py-3 px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold order-2 sm:order-1 flex-1"
            >
              পরে করব (Go Back)
            </button>
            <button
              onClick={() => router.push('/kyc?redirect=/listings/new')}
              className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 order-1 sm:order-2 flex-1 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>NID ভেরিফিকেশন শুরু করুন ➔</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Wizard Progress Indicator */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">নতুন বিজ্ঞাপন পোস্ট করুন</h1>
          <p className="text-xs text-slate-500">ধাপ {currentStep} এর ৫</p>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-7 h-2 rounded-full transition-all ${s <= currentStep ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Category & Condition */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-slide-up bg-white p-6 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-3">
              ক্যাটাগরি নির্বাচন করুন (Select Category)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${category === cat.key
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="text-xs font-bold">{cat.label}</p>
                    <p className="text-[10px] text-slate-400">{cat.labelBn}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-3">
              পণ্যের অবস্থা (Item Condition)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {conditions.map((cond) => (
                <label
                  key={cond.key}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${condition === cond.key
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="condition"
                      value={cond.key}
                      checked={condition === cond.key}
                      onChange={() => setCondition(cond.key)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold">{cond.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">({cond.labelBn})</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm"
          >
            <span>পরবর্তী ধাপ: বিস্তারিত বিবরণ (Next: Details)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Details */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-slide-up bg-white p-6 rounded-2xl border border-slate-200">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-900">বিজ্ঞাপনের শিরোনাম (Title)</label>
              <div className="flex items-center gap-2">
                {title.trim().length > 0 && title.trim().length < 10 && (
                  <span className="text-[10px] text-amber-600 font-medium">কমপক্ষে ১০ অক্ষর আবশ্যক</span>
                )}
                {title.trim().length >= 10 && (
                  <span className="text-[10px] text-emerald-600 font-medium">✓ সঠিক</span>
                )}
                <span className="text-[10px] text-slate-400">{title.length}/100</span>
              </div>
            </div>
            <input
              type="text"
              maxLength={100}
              placeholder="যেমন: iPhone 15 Pro Max - 256GB (With Box)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-white transition-colors ${title.trim().length > 0 && title.trim().length < 10
                ? 'border-amber-400 focus:ring-amber-200'
                : 'border-slate-200 focus:ring-emerald-200'
                }`}
            />
            {title.trim().length > 0 && title.trim().length < 10 && (
              <p className="text-[11px] text-amber-600 mt-1">
                ⚠️ শিরোনাম কমপক্ষে ১০ অক্ষরের হতে হবে (আরও {10 - title.trim().length} অক্ষর লিখুন)
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-900">বিস্তারিত বিবরণ (Description)</label>
              <div className="flex items-center gap-2">
                {description.trim().length > 0 && description.trim().length < 20 && (
                  <span className="text-[10px] text-amber-600 font-medium">কমপক্ষে ২০ অক্ষর আবশ্যক</span>
                )}
                {description.trim().length >= 20 && (
                  <span className="text-[10px] text-emerald-600 font-medium">✓ সঠিক</span>
                )}
                <span className="text-[10px] text-slate-400">{description.length}/2000</span>
              </div>
            </div>
            <textarea
              rows={5}
              maxLength={2000}
              placeholder="পণ্যের অবস্থা, ক্রয়ের তারিখ, কোনো ত্রুটি থাকলে স্পষ্টভাবে উল্লেখ করুন (ন্যূনতম ২০ অক্ষর)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full p-3 text-xs rounded-xl border bg-white resize-none transition-colors ${description.trim().length > 0 && description.trim().length < 20
                ? 'border-amber-400 focus:ring-amber-200'
                : 'border-slate-200 focus:ring-emerald-200'
                }`}
            />
            {description.trim().length > 0 && description.trim().length < 20 && (
              <p className="text-[11px] text-amber-600 mt-1">
                ⚠️ বিবরণ কমপক্ষে ২০ অক্ষরের হতে হবে (আরও {20 - description.trim().length} অক্ষর লিখুন)
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">মূল্য (Price in BDT ৳)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ৳
              </span>
              <input
                type="number"
                min={50}
                max={2500000}
                placeholder="50 থেকে 2,500,000 পর্যন্ত"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 bg-white"
              />
            </div>
            {price && (Number(price) < 50 || Number(price) > 2500000) ? (
              <p className="text-[11px] text-red-500 mt-1">
                ⚠️ মূল্য ৫০ টাকা থেকে ২৫,০০,০০০ টাকার মধ্যে হতে হবে
              </p>
            ) : price ? (
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                ৳ {Number(price).toLocaleString('bn-BD')} টাকা
              </p>
            ) : null}
          </div>

          {/* Chat-Only Mode Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">চ্যাট-অনলি মোড (Chat-Only Mode)</p>
              <p className="text-[11px] text-slate-500">
                বিজ্ঞাপনে আপনার ফোন নম্বর গোপন রাখুন, ক্রেতারা শুধু চ্যাট করতে পারবে।
              </p>
            </div>
            <input
              type="checkbox"
              checked={isPhoneHidden}
              onChange={(e) => setIsPhoneHidden(e.target.checked)}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep2}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>পরবর্তী ধাপ: ছবি আপলোড (Next: Photos)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Photos & Video */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-slide-up bg-white p-6 rounded-2xl border border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              পণ্যের ছবি ও ভিডিও (Photos & Video)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              কমপক্ষে ১টি এবং সর্বোচ্চ ৮টি ছবি আপলোড করুন। প্রথম ছবিটি কভার ফটো হিসেবে প্রদর্শিত হবে।
            </p>
            <ImageUpload uploadedImages={imageUrls} onChange={setImageUrls} maxImages={8} />
            {imageUrls.length === 0 && (
              <p className="text-[11px] text-amber-600 font-medium mt-2">
                ⚠️ পরবর্তী ধাপে যেতে কমপক্ষে ১টি ছবি আপলোড করুন।
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              ভিডিও লিঙ্ক (ঐচ্ছিক / Video URL)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep3}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>পরবর্তী ধাপ: অবস্থান নির্বাচন (Next: Location)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Location */}
      {currentStep === 4 && (
        <div className="space-y-5 animate-slide-up bg-white p-6 rounded-2xl border border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">অবস্থান ও এলাকা (Location)</h2>
            <p className="text-xs text-slate-500 mb-4">
              সঠিক লোকেশন নির্বাচন করুন যাতে নিকটস্থ ক্রেতারা সহজে আপনার পণ্য খুঁজে পায়।
            </p>
            <LocationPicker
              initialDivision={location.division}
              initialDistrict={location.district}
              initialThana={location.thana}
              onChange={setLocation}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>
                পিন কো-অর্ডিনেট: [{coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}]
              </span>
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium"
            >
              📍 আমার অবস্থান পিন করুন (Use My Location)
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep4}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>পর্যালোচনা ও প্রকাশ (Review & Publish)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Review & Publish */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-slide-up bg-white p-6 rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">বিজ্ঞাপনের পূর্বরূপ (Preview)</h2>
            <p className="text-xs text-slate-500">প্রকাশের পূর্বে সব তথ্য যাচাই করে নিন</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {imageUrls[0] && (
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(imageUrls[0])} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                {condition.replace('_', ' ')}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-base font-extrabold text-emerald-700">
                ৳ {Number(price).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                📍 {location.thana}, {location.division}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 whitespace-pre-line border-t border-slate-100 pt-3">
            {description}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePublish}
              className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>প্রকাশ করুন (Publish Listing)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

