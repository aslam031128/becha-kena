'use client';

import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/context';

export default function ContactPage() {
  const { locale } = useTranslation();
  const isEn = locale !== 'bn';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error(isEn ? 'Please fill in all required fields' : 'দয়া করে সকল প্রয়োজনীয় তথ্য পূরণ করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      // Simulate ticket creation
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSubmitted(true);
      toast.success(isEn ? 'Your message has been submitted successfully!' : 'আপনার বার্তা সফলভাবে গৃহীত হয়েছে!');
    } catch {
      toast.error(isEn ? 'Failed to send message, please try again' : 'বার্তা পাঠানো সম্ভব হয়নি, পুনরায় চেষ্টা করুন');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactChannels = [
    {
      icon: <Phone className="w-5 h-5 text-emerald-600" />,
      title: isEn ? 'Emergency Helpline' : 'জরুরি হেল্পলাইন নম্বর',
      value: '+880 1747-638951',
      sub: isEn ? '9:00 AM - 9:00 PM (Every day)' : 'সকাল ৯:০০ - রাত ৯:০০ (প্রতিদিন)',
      action: 'tel:+8801747638951',
      actionLabel: isEn ? 'Call Now' : 'কল করুন',
    },
    {
      icon: <Mail className="w-5 h-5 text-blue-600" />,
      title: isEn ? 'Support Email' : 'সাপোর্ট ইমেইল',
      value: 'support@becha-kena.com',
      sub: isEn ? 'Send us an email anytime' : 'যেকোনো সময় ইমেইল করুন',
      action: 'mailto:support@becha-kena.com',
      actionLabel: isEn ? 'Send Email' : 'ইমেইল পাঠান',
    },
    {
      icon: <MapPin className="w-5 h-5 text-purple-600" />,
      title: isEn ? 'Headquarters' : 'হেডকোয়ার্টার',
      value: isEn ? 'Road 11, Banani, Dhaka-1213' : 'রোড ১১, বনানী, ঢাকা-১২১৩',
      sub: isEn ? 'Bangladesh' : 'বাংলাদেশ',
      action: '#',
      actionLabel: isEn ? 'View Location' : 'লোকেশন দেখুন',
    },
    {
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      title: isEn ? 'Operational Hours' : 'কার্যদিবস ও সময়',
      value: isEn ? 'Saturday - Thursday' : 'শনিবার - বৃহস্পতিবার',
      sub: isEn ? '9:00 AM to 6:00 PM' : 'সকাল ৯:০০ থেকে সন্ধ্যা ৬:০০ টা',
      action: '#',
      actionLabel: isEn ? 'Open Hours' : 'অফিস সময়',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? '24/7 Dedicated Support' : '২৪/৭ সার্বক্ষণিক সহায়তা'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Contact Us & Customer Support' : 'যোগাযোগ ও গ্রাহক সহায়তা'}
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            {isEn
              ? 'Have questions about NID verification, listings, or safety? Our specialized team is here to assist you.'
              : 'NID ভেরিফিকেশন, বিজ্ঞাপন বা কেনাবেচার নিরাপত্তা সংক্রান্ত যেকোনো প্রয়োজনে আমাদের দক্ষ টিম আপনার পাশে আছে।'}
          </p>
        </div>

        {/* Contact Channel Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactChannels.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {item.title}
                  </h3>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{item.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <a
                  href={item.action}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  {item.actionLabel} &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Form & Assurance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">
                {isEn ? 'Send Direct Message' : 'সরাসরি বার্তা পাঠান'}
              </h2>
            </div>

            {isSubmitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {isEn ? 'Thank you! Your message has been received' : 'ধন্যবাদ! আপনার বার্তা আমরা পেয়েছি'}
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {isEn
                    ? 'Our support officer will get in touch with you via your provided mobile number or email shortly.'
                    : 'আমাদের সাপোর্ট প্রতিনিধি দ্রুততম সময়ের মধ্যে আপনার উল্লেখিত নম্বরে যোগাযোগ করবেন।'}
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setName('');
                    setPhone('');
                    setMessage('');
                  }}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-colors"
                >
                  {isEn ? 'Send Another Message' : 'আরেকটি বার্তা পাঠান'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      {isEn ? 'Your Name *' : 'আপনার নাম *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isEn ? 'e.g. Tanvir Ahmed' : 'যেমন: তানভীর আহমেদ'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      {isEn ? 'Mobile Number *' : 'মোবাইল নম্বর *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={isEn ? 'e.g. 017xxxxxxxx' : 'যেমন: 017xxxxxxxx'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {isEn ? 'Inquiry Category' : 'জিজ্ঞাসার বিষয়'}
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white transition-all"
                  >
                    <option value="general">{isEn ? 'General Inquiry' : 'সাধারণ জিজ্ঞাসা'}</option>
                    <option value="nid">{isEn ? 'NID Verification Issue' : 'NID ভেরিফিকেশন সমস্যা'}</option>
                    <option value="dispute">{isEn ? 'Scam Report / Police GD Claim' : 'প্রতারণা অভিযোগ / পুলিশ জিডি সংক্রান্ত'}</option>
                    <option value="account">{isEn ? 'Account & Listing Help' : 'অ্যাকাউন্ট ও বিজ্ঞাপন সহায়তা'}</option>
                    <option value="partnership">{isEn ? 'Corporate / Partnership' : 'প্রাতিষ্ঠানিক বা পার্টনারশিপ'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {isEn ? 'Message Details *' : 'আপনার বার্তার বিবরণ *'}
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isEn ? 'Explain your request or issue in detail...' : 'আপনার সমস্যার বিবরণ বিস্তারিত লিখুন...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? isEn ? 'Sending...' : 'বার্তা পাঠানো হচ্ছে...'
                      : isEn ? 'Submit Message' : 'বার্তা পাঠান'}
                  </span>
                </button>
              </form>
            )}
          </div>

          {/* Quick FAQ / Assistance Box */}
          <div className="space-y-4">
            <div className="bg-emerald-900 text-white rounded-2xl p-6 sm:p-7 space-y-4">
              <h3 className="text-base font-bold">
                {isEn ? 'NID Verification Delayed?' : 'NID যাচাইকরণ দেরি হচ্ছে?'}
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                {isEn
                  ? 'Our automatic verification usually finishes within 5-15 minutes. If manual review is required, our staff confirms your details within 24 hours.'
                  : 'সাধারণত ৫-১৫ মিনিটের মধ্যে স্বয়ংক্রিয় যাচাই সম্পন্ন হয়। কিছু ক্ষেত্রে ম্যানুয়াল পর্যালোচনার প্রয়োজন হলে সর্বোচ্চ ২৪ ঘণ্টার মধ্যে নিশ্চিত করা হয়।'}
              </p>
              <div className="pt-2">
                <a
                  href="/verification-guide"
                  className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline"
                >
                  {isEn ? 'Read Verification Guide &rarr;' : 'ভেরিফিকেশন নির্দেশিকা পড়ুন &rarr;'}
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {isEn ? 'Emergency Dispute Service' : 'জরুরি বিরোধ ও আইনি নোটিশ'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isEn
                  ? 'To lodge a stolen item claim or escalate fraud with police GD, visit the dispute center directly.'
                  : 'কোনো কেনাবেচায় বিরোধ বা চুরি যাওয়া পণ্যের দাবি সংক্রান্ত জিডি জমা দিতে বিরোধ নিষ্পত্তি সেন্টারে যোগাযোগ করুন।'}
              </p>
              <a
                href="/dispute-policy"
                className="text-xs font-semibold text-slate-800 hover:text-emerald-600 block pt-1"
              >
                {isEn ? 'Dispute Policy & Procedures &rarr;' : 'বিরোধ নিষ্পত্তি নীতিমালা দেখুন &rarr;'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
