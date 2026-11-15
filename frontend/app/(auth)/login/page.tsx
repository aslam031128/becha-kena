'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { PhoneInput } from '@/components/kyc/phone-input';
import { OtpInput } from '@/components/kyc/otp-input';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { getOrCreateDeviceUUID } from '@/lib/api/client';
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // Step 1: Phone, Step 2: OTP
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timers & Rate limit
  const [countdown, setCountdown] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  // Device Limit Modal state (423 error)
  const [showDeviceLimitModal, setShowDeviceLimitModal] = useState(false);

  // Timer tick for OTP expiration
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Rate limit countdown tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rateLimitSeconds && rateLimitSeconds > 0) {
      timer = setInterval(() => {
        setRateLimitSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  // Step 1: Validate BD Phone Number & Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPhoneError('');

    // BD Phone format: 1XXXXXXXXX (10 digits starting with 3-9)
    const bdRegex = /^1[3-9]\d{8}$/;
    if (!bdRegex.test(phone)) {
      setPhoneError('সঠিক বাংলাদেশি ফোন নম্বর দিন (যেমন: 1712345678)');
      return;
    }

    try {
      setIsSubmitting(true);
      const fullPhone = `+880${phone}`;
      const res = await authApi.requestOtp(fullPhone);

      if (res.data.success) {
        toast.success('আপনার মোবাইলে OTP পাঠানো হয়েছে');
        const devOtp = (res.data.data as { debugOtp?: string })?.debugOtp;
        if (devOtp) {
          toast(`🔑 Dev Mode OTP: ${devOtp}`, {
            duration: 15000,
            style: {
              background: '#064e3b',
              color: '#6ee7b7',
              fontWeight: 'bold'
            }
          });
        }
        setStep(2);
        setCountdown(120);
        setCanResend(false);
        setOtp('');
      }
    } catch (err: unknown) {
      const errorData = (err as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } })?.response;
      if (errorData?.status === 429) {
        setRateLimitSeconds(60);
        toast.error('অনেক বেশি চেষ্টা করা হয়েছে। কিছুক্ষণ অপেক্ষা করুন।');
      } else {
        toast.error(errorData?.data?.error?.message || 'OTP পাঠাতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = useCallback(
    async (codeToVerify?: string) => {
      const code = codeToVerify || otp;
      if (code.length !== 6) return;

      try {
        setIsSubmitting(true);
        setOtpError(false);
        const fullPhone = `+880${phone}`;
        const deviceUUID = getOrCreateDeviceUUID();
        const deviceName = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'Browser';

        const res = await authApi.verifyOtp({
          phone: fullPhone,
          otp: code,
          deviceUUID,
          deviceName,
        });

        if (res.data.success && res.data.data) {
          const { accessToken, user, isNewUser } = res.data.data;
          useAuthStore.getState().setAuth(user, accessToken);

          toast.success('লগইন সফল হয়েছে!');

          const isAdmin = user.role === 'super_admin' || user.role === 'moderator';

          if (isAdmin) {
            // Admin users go directly to the Admin Dashboard
            const targetUrl = redirectUrl && redirectUrl !== '/' ? redirectUrl : '/admin/users';
            router.push(targetUrl);
          } else if (isNewUser || !user.isNidVerified) {
            router.push('/kyc');
          } else {
            router.push(redirectUrl);
          }
        }
      } catch (err: unknown) {
        const errorData = (err as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } })?.response;
        setOtpError(true);

        if (errorData?.status === 423 || errorData?.data?.error?.code === 'DEVICE_LIMIT_EXCEEDED') {
          setShowDeviceLimitModal(true);
        } else {
          toast.error(errorData?.data?.error?.message || 'ভুল OTP কোড। আবার চেষ্টা করুন।');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [otp, phone, redirectUrl, router]
  );

  return (
    <div className="space-y-6">
      {/* Step 1: Phone Input */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-5 animate-slide-up">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              আপনার ফোন নম্বর দিন
            </h2>
            <p className="text-xs text-slate-500">
              Enter your phone number (i18n: enterPhoneNumber)
            </p>
          </div>

          <div className="py-2">
            <PhoneInput
              value={phone}
              onChange={setPhone}
              error={phoneError}
              disabled={isSubmitting || rateLimitSeconds !== null}
            />
          </div>

          {rateLimitSeconds && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>পুনরায় চেষ্টা করুন {rateLimitSeconds} সেকেন্ডে (Retry in {rateLimitSeconds}s)</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || phone.length < 10 || rateLimitSeconds !== null}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>ওটিপি পাঠান (Send OTP)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            এগিয়ে যাওয়ার মাধ্যমে আপনি আমাদের{' '}
            <a href="/terms" className="underline hover:text-slate-600">Terms of Service</a> ও{' '}
            <a href="/privacy" className="underline hover:text-slate-600">Privacy Policy</a> মেনে নিচ্ছেন।
          </p>
        </form>
      )}

      {/* Step 2: OTP Verification */}
      {step === 2 && (
        <div className="space-y-6 animate-slide-up">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              OTP কোড পাঠানো হয়েছে
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              +880{phone} নম্বরে ৬ সংখ্যার কোড দেওয়া হয়েছে
            </p>
          </div>

          {/* 6-Digit Auto-Focus OTP Input */}
          <div className="py-2">
            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(code) => handleVerifyOtp(code)}
              disabled={isSubmitting}
              hasError={otpError}
            />
          </div>

          {/* Countdown & Resend Option */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span className="flex items-center gap-1.5">
              <span>⏱️</span>
              <span>
                {Math.floor(countdown / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(countdown % 60).toString().padStart(2, '0')} remaining
              </span>
            </span>

            {canResend ? (
              <button
                onClick={() => handleRequestOtp()}
                disabled={isSubmitting}
                className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>পুনরায় পাঠান (Resend)</span>
              </button>
            ) : (
              <span className="text-slate-400">কোড পাননি?</span>
            )}
          </div>

          {/* Back & Verify CTA */}
          <div className="space-y-3">
            <button
              onClick={() => handleVerifyOtp()}
              disabled={isSubmitting || otp.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>যাচাই করুন (Verify)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={() => {
                setStep(1);
                setOtp('');
                setOtpError(false);
              }}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← ফোন নম্বর পরিবর্তন করুন (Change Phone)</span>
            </button>
          </div>
        </div>
      )}

      {/* Device Limit Exceeded Modal (423 DEVICE_LIMIT_EXCEEDED) */}
      {showDeviceLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ডিভাইস সীমা অতিক্রম হয়েছে (Max 2 Devices)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনার অ্যাকাউন্টে ইতিমধ্যে সর্বোচ্চ ২টি ডিভাইস সক্রিয় রয়েছে। নতুন ডিভাইসটি যুক্ত করতে বায়োমেট্রিক NID ভেরিফিকেশনের মাধ্যমে অনুমোদন করুন।
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeviceLimitModal(false);
                  router.push('/kyc');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                বায়োমেট্রিক অনুমোদন দিন (Verify Device)
              </button>
              <button
                onClick={() => setShowDeviceLimitModal(false)}
                className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium"
              >
                বাতিল করুন (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-slate-400">
          লগইন ফর্ম লোড হচ্ছে...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

