'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import { userApi } from '@/lib/api/user.api';
import { uploadApi } from '@/lib/api/upload.api';
import { User, NotificationPreferences } from '@/lib/types/user.types';
import { ReportHistory } from '@/components/report/report-history';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Calendar,
  CheckCircle2,
  Flag,
  User as UserIcon,
  Star,
  Package,
  Camera,
  Bell,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProfileDashboardPage() {
  const { user: authUser, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(authUser);
  const [activeTab, setActiveTab] = useState<'edit' | 'preferences' | 'safety' | 'account' | 'devices'>('edit');

  // Edit Profile Form State
  const [displayName, setDisplayName] = useState(authUser?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(authUser?.avatarUrl || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notification Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    smsEnabled: false,
    priceDropAlerts: true,
    chatMessages: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await userApi.getMyProfile();
        if (res.data?.success && res.data.data) {
          const user = res.data.data;
          setProfile(user);
          setDisplayName(user.displayName || '');
          setAvatarUrl(user.avatarUrl || null);
          if (user.notificationPreferences) {
            setPreferences((prev) => ({
              ...prev,
              ...user.notificationPreferences,
            }));
          }
        }
      } catch {
        // fallback to auth store
      }
    }
    loadProfile();
  }, []);

  const displayUser = profile || authUser;

  // Direct-to-S3 Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar size must be under 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const presignedRes = await uploadApi.getPresignedUrl({
        context: 'avatar',
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      const { uploadUrl, objectKey } = presignedRes.data.data;

      // PUT directly to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      // Confirm upload
      const confirmRes = await uploadApi.confirmUpload(objectKey, 'avatar');
      const publicUrl = confirmRes.data.data.publicUrl;

      setAvatarUrl(publicUrl);
      toast.success('Avatar uploaded successfully! Click Save Changes to apply.');
    } catch {
      toast.error('Avatar upload failed');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      const res = await userApi.updateProfile({
        displayName: displayName.trim(),
        avatarUrl,
      });

      if (res.data?.success) {
        toast.success('প্রোফাইল সফলভাবে আপডেট হয়েছে (Profile saved)');
        if (displayUser) {
          const updated = {
            ...displayUser,
            displayName: displayName.trim(),
            avatarUrl,
          };
          setProfile(updated);
          updateUser(updated);
        }
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save Notification Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPreferences(true);
      await userApi.updateNotificationPreferences(preferences);
      toast.success('নোটিফিকেশন পছন্দসমূহ সংরক্ষিত হয়েছে (Preferences saved)');
    } catch {
      toast.error('Failed to update notification preferences');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Profile Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Camera upload trigger */}
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-500 text-white font-extrabold flex items-center justify-center text-3xl shadow-sm overflow-hidden border-2 border-emerald-300">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={displayUser?.displayName || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : displayUser?.displayName ? (
                displayUser.displayName.charAt(0).toUpperCase()
              ) : (
                <UserIcon className="w-10 h-10" />
              )}
            </div>

            <label className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white shadow-lg cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {displayUser?.displayName || 'Citizen'}
              </h1>

              {displayUser?.isNidVerified ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>NID ভেরিফাইড নাগরিক</span>
                </span>
              ) : (
                <Link
                  href="/kyc?retry=true"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-bold transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>কেওয়াইসি সম্পন্ন করুন (Complete KYC)</span>
                </Link>
              )}
            </div>

            <p className="text-xs text-slate-500 font-mono">
              মোবাইল: {displayUser?.phone} (অপরিবর্তনযোগ্য)
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <strong className="text-slate-800 font-bold">
                  {displayUser?.averageRating ? displayUser.averageRating.toFixed(1) : '5.0'}
                </strong>
                <span>রেটিং</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4 text-slate-400" />
                <span>{displayUser?.totalDealsCompleted || 0} সম্পন্ন ডিল</span>
              </span>
              {(displayUser?.memberSince || displayUser?.createdAt) && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      সদস্য:{' '}
                      {new Date(
                        displayUser.memberSince || displayUser.createdAt!
                      ).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('edit')}
          className={`pb-3 flex items-center gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'edit'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>প্রোফাইল তথ্য (Edit Profile)</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 flex items-center gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'preferences'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>নোটিফিকেশন পছন্দ (Preferences)</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`pb-3 flex items-center gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'safety'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>রিপোর্ট ও নিরাপত্তা (Reports & Safety)</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`pb-3 flex items-center gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'account'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>কেওয়াইসি স্থিতি (KYC Status)</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 flex items-center gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'devices'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>ডিভাইস ({displayUser?.deviceUUIDs?.length || 1})</span>
        </button>
      </div>

      {/* Tab 1: Edit Profile */}
      {activeTab === 'edit' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              প্রোফাইল তথ্য হালনাগাদ (Edit Profile Information)
            </h2>
            <p className="text-xs text-slate-500">
              মার্কেটপ্লেসে আপনার প্রদর্শিত নাম এবং প্রোফাইল ছবি পরিবর্তন করুন
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                প্রদর্শিত নাম (Display Name)
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="যেমন: ফারহানা রহমান"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                নিবন্ধিত মোবাইল নম্বর (Phone Number)
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={displayUser?.phone || ''}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                মোবাইল নম্বর পরিবর্তন করতে সিম রি-বাইন্ড সিকিউরিটি প্রটোকল প্রয়োজন।
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile || isUploadingAvatar}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingProfile ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন (Save Changes)'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Notification Preferences */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              নোটিফিকেশন পছন্দসমূহ (Notification Preferences)
            </h2>
            <p className="text-xs text-slate-500">
              আপনি কোন ধরনের আপডেট ও সতর্কবার্তা পেতে চান তা নির্বাচন করুন
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  পুশ নোটিফিকেশন (Push Notifications)
                </span>
                <span className="text-[11px] text-slate-500">
                  ব্রাউজার ও মোবাইল অ্যাপে সরাসরি রিয়েল-টাইম নোটিফিকেশন পান
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={(e) => setPreferences({ ...preferences, pushEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  এসএমএস অ্যালার্ট (SMS Fallback)
                </span>
                <span className="text-[11px] text-slate-500">
                  অফলাইনে থাকাকালীন গুরুত্বপূর্ণ ডিল ও সিকিউরিটি এসএমএস
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.smsEnabled}
                onChange={(e) => setPreferences({ ...preferences, smsEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  দাম কমার নোটিফিকেশন (Price Drop Alerts)
                </span>
                <span className="text-[11px] text-slate-500">
                  পছন্দের তালিকায় থাকা কোনো পণ্যের দাম কমলে তাৎক্ষণিক নোটিফিকেশন
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.priceDropAlerts}
                onChange={(e) => setPreferences({ ...preferences, priceDropAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  চ্যাট মেসেজ নোটিফিকেশন (Chat Messages)
                </span>
                <span className="text-[11px] text-slate-500">
                  ক্রেতা বা বিক্রেতার যেকোনো নতুন বার্তার নোটিফিকেশন
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.chatMessages}
                onChange={(e) => setPreferences({ ...preferences, chatMessages: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              শান্ত সময় (Quiet Hours - ডু নট ডিস্টার্ব)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  শুরু (From):
                </label>
                <input
                  type="time"
                  value={preferences.quietHoursStart || '22:00'}
                  onChange={(e) => setPreferences({ ...preferences, quietHoursStart: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  শেষ (To):
                </label>
                <input
                  type="time"
                  value={preferences.quietHoursEnd || '08:00'}
                  onChange={(e) => setPreferences({ ...preferences, quietHoursEnd: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingPreferences}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingPreferences ? 'সংরক্ষণ হচ্ছে...' : 'পছন্দসমূহ সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Safety & Report History */}
      {activeTab === 'safety' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              আপনার দায়েরকৃত রিপোর্টসমূহ (My Reports)
            </h2>
            <p className="text-xs text-slate-500">
              মার্কেটপ্লেস সুরক্ষিত রাখতে আপনার জমা দেওয়া অভিযোগের বর্তমান অবস্থা
            </p>
          </div>

          <ReportHistory />
        </div>
      )}

      {/* Tab 4: KYC & Verification Status */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            জাতীয় পরিচয়পত্র ও নাগরিক স্থিতি (NID Verification Status)
          </h2>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                displayUser?.isNidVerified
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {displayUser?.isNidVerified ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                {displayUser?.isNidVerified
                  ? 'এনআইডি যাচাইকৃত নাগরিক (Verified Citizen)'
                  : 'কেওয়াইসি অসম্পূর্ণ (Unverified Citizen)'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {displayUser?.isNidVerified
                  ? 'আপনার জাতীয় পরিচয়পত্র এবং লাইভ সেলফি বায়োমেট্রিক সফলভাবে অনুমোদিত হয়েছে। আপনি স্বাধীনভাবে কেনাবেচা ও অফার আদান-প্রদান করতে পারবেন।'
                  : 'নিরাপদ লেনদেন এবং প্রতারণামুক্ত মার্কেটপ্লেস নিশ্চিত করতে অনুগ্রহ করে এনআইডি ফ্রন্ট, ব্যাক এবং সেলফি দিয়ে ভেরিফিকেশন সম্পন্ন করুন।'}
              </p>
              {!displayUser?.isNidVerified && (
                <div className="pt-2">
                  <Link
                    href="/kyc?retry=true"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>এখনই যাচাই করুন (Verify Now)</span>
                    <span>→</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Devices */}
      {activeTab === 'devices' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              সংযুক্ত ডিভাইসসমূহ (Authorized Devices)
            </h2>
            <p className="text-xs text-slate-500">
              আপনার একাউন্টে বর্তমানে সক্রিয় থাকা ডিভাইসসমূহ (সর্বোচ্চ ২টি অনুমতিপ্রাপ্ত)
            </p>
          </div>

          <div className="space-y-3">
            {(displayUser?.deviceUUIDs || ['Current Session Device']).map((uuid, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {idx === 0 ? 'বর্তমান ডিভাইস (Active Device)' : `অন্য ডিভাইস #${idx + 1}`}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                      UUID: {uuid}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                  স্বীকৃত (Authorized)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
