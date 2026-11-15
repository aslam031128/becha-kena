'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { KycProgressSteps } from '@/components/kyc/kyc-progress-steps';
import { NidCapture } from '@/components/kyc/nid-capture';
import { SelfieLiveness } from '@/components/kyc/selfie-liveness';
import { kycApi, VerifyNidInput } from '@/lib/api/kyc.api';
import { useAuthStore } from '@/lib/store/auth.store';
import toast from 'react-hot-toast';

export default function KycPage() {
  const router = useRouter();
  const { updateUser } = useAuthStore();

  // Wizard Steps: 1: NID, 2: Selfie, 3: Processing & Result, 4: Done
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [nidNumber, setNidNumber] = useState('');
  const [dob, setDob] = useState('');
  const [frontKey, setFrontKey] = useState<string | null>(null);
  const [backKey, setBackKey] = useState<string | null>(null);
  const [selfieKey, setSelfieKey] = useState<string | null>(null);
  const [livenessMeta, setLivenessMeta] = useState<{
    blinkDetected?: boolean;
    headTurnDetected?: boolean;
    confidence?: number;
  }>({ blinkDetected: true, headTurnDetected: true, confidence: 0.95 });

  // Verification Processing States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(1);
  const [isManualReview, setIsManualReview] = useState(false);

  // Handle NID images uploaded
  const handleNidUploaded = (front: string, back: string) => {
    setFrontKey(front);
    setBackKey(back);
  };

  // Handle Selfie uploaded
  const handleSelfieUploaded = (
    key: string,
    meta: { blinkDetected: boolean; headTurnDetected: boolean; confidence: number }
  ) => {
    setSelfieKey(key);
    setLivenessMeta(meta);
  };

  // Check current KYC status on load (e.g. if already in manual review)
  React.useEffect(() => {
    async function checkCurrentStatus() {
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('retry') === 'true') {
            setIsManualReview(false);
            setStep(1);
            return;
          }
        }

        const res = await kycApi.getStatus();
        if (res.data?.success && res.data.data) {
          const { kycStatus, isNidVerified } = res.data.data;
          if (isNidVerified) {
            router.push('/listings');
          } else if (kycStatus === 'manual_review' || kycStatus === 'pending') {
            setStep(3);
            setIsManualReview(true);
          }
        }
      } catch {
        // Continue wizard
      }
    }
    checkCurrentStatus();
  }, [router]);

  // Submit full KYC payload to backend
  const handleFinalSubmit = async () => {
    if (!frontKey || !backKey || !selfieKey) {
      toast.error('NID এবং সেলফি উভয় তথ্যই প্রয়োজনীয়');
      return;
    }

    setStep(3);
    setIsVerifying(true);
    setVerificationError(null);

    try {
      const payload: VerifyNidInput = {
        nidNumber: nidNumber.trim() || 'NID-' + Date.now(),
        dob: dob || '1995-01-01',
        frontImageKey: frontKey,
        backImageKey: backKey,
        liveSelfieKey: selfieKey,
        livenessMeta,
      };

      const res = await kycApi.verifyNid(payload);

      if (res.data.success && res.data.data) {
        const { status, isNidVerified } = res.data.data;

        if (status === 'verified' || isNidVerified) {
          updateUser({ isNidVerified: true, kycStatus: 'verified' });
          setStep(4);
          toast.success('পরিচয় যাচাই সফল হয়েছে!');
          setTimeout(() => {
            router.push('/listings');
          }, 2500);
        } else {
          // Routed to Admin Manual Review Queue
          setIsManualReview(true);
          updateUser({ isNidVerified: false, kycStatus: 'manual_review' });
          toast.success('আবেদন জমা সম্পন্ন হয়েছে! অ্যাডমিন রিভিউ প্রক্রিয়াধীন।');
        }
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'যাচাইকরণে ত্রুটি হয়েছে।';
      if (attemptCount >= 3) {
        setIsManualReview(true);
      } else {
        setAttemptCount((prev) => prev + 1);
        setVerificationError(msg);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps Header */}
      <KycProgressSteps currentStep={step} />

      {/* STEP 1: NID Photo & Basic Details */}
      {step === 1 && (
        <div className="space-y-5 animate-slide-up">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              জাতীয় পরিচয়পত্র আপলোড (Upload NID Card)
            </h2>
            <p className="text-xs text-slate-500">
              Step 1 of 3: জাতীয় পরিচয়পত্রের সামনের ও পিছনের ছবি দিন
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NID নম্বর (ঐচ্ছিক / স্বয়ংক্রিয় স্ক্যান)
              </label>
              <input
                type="text"
                placeholder="10 or 17 digit NID"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                জন্ম তারিখ (Date of Birth)
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          {/* NID Capture Zones */}
          <NidCapture onBothUploaded={handleNidUploaded} />

          <button
            type="button"
            disabled={!frontKey || !backKey}
            onClick={() => setStep(2)}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>পরবর্তী ধাপ: সেলফি যাচাই (Next: Selfie)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Live Selfie Liveness Detection */}
      {step === 2 && (
        <div className="space-y-5 animate-slide-up">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              সেলফি যাচাইকরণ (Selfie Verification)
            </h2>
            <p className="text-xs text-slate-500">
              Step 2 of 3: ক্যামেরা বৃত্তের ভেতর মুখ রেখে চোখ পিটপিট করুন
            </p>
          </div>

          <SelfieLiveness onSelfieUploaded={handleSelfieUploaded} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!selfieKey}
              onClick={handleFinalSubmit}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span>পরিচয় যাচাই নিশ্চিত করুন (Submit for Verification)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Verification Processing & Fallbacks */}
      {step === 3 && (
        <div className="py-8 text-center space-y-6 animate-slide-up">
          {isVerifying ? (
            <div className="space-y-4">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  যাচাই করা হচ্ছে... (Verifying...)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  বায়োমেট্রিক অ্যালগরিদম দ্বারা NID ও সেলফি মেলানো হচ্ছে
                </p>
              </div>
            </div>
          ) : isManualReview ? (
            <div className="space-y-4 p-6 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-blue-950">
                ম্যানুয়াল পর্যালোচনার জন্য পাঠানো হয়েছে
              </h3>
              <p className="text-xs text-blue-800 leading-relaxed max-w-sm mx-auto">
                আপনার অনুরোধ ম্যানুয়াল রিভিউতে পাঠানো হয়েছে। আমাদের মডারেশন টিম ৪ ঘণ্টার মধ্যে যাচাই করে আপনাকে SMS বা নোটিফিকেশনের মাধ্যমে জানাবে।
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => router.push('/listings')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  ড্যাশবোর্ডে যান (Go to Dashboard)
                </button>
                <button
                  onClick={() => {
                    setIsManualReview(false);
                    setStep(1);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-blue-300 text-blue-950 bg-white hover:bg-blue-100 text-xs font-bold transition-colors"
                >
                  🔄 নতুন করে আবেদন করুন (Re-apply KYC)
                </button>
              </div>
            </div>
          ) : verificationError ? (
            <div className="space-y-4 p-6 rounded-2xl bg-red-50 border border-red-200">
              <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-red-950">যাচাইকরণ ব্যর্থ হয়েছে</h3>
              <p className="text-xs text-red-700 leading-relaxed max-w-sm mx-auto">
                {verificationError}
              </p>
              <p className="text-[11px] text-slate-500">
                অবশিষ্ট প্রচেষ্টা: {Math.max(0, 3 - attemptCount)} বার
              </p>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>আবার চেষ্টা করুন (Try Again)</span>
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* STEP 4: Success Celebration */}
      {step === 4 && (
        <div className="py-8 text-center space-y-4 animate-slide-up">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            ✅ আপনার পরিচয় যাচাই সম্পন্ন!
          </h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            আপনার জাতীয় পরিচয়পত্র সফলভাবে ভেরিফাই হয়েছে। এখন থেকে আপনি নিরাপদভাবে বিজ্ঞাপন পোস্ট ও চ্যাট করতে পারবেন।
          </p>
          <div className="pt-2">
            <span className="text-xs text-emerald-700 font-semibold animate-pulse">
              ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

