'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Paperclip, ShieldCheck, Tag, X, Flag } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useChatRoom } from '@/lib/socket/hooks';
import { chatApi } from '@/lib/api/chat.api';
import { offerApi } from '@/lib/api/offer.api';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ScamWarningBanner } from '@/components/chat/scam-warning-banner';
import { OfferCard } from '@/components/chat/offer-card';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ReportModal } from '@/components/report/report-modal';
import toast from 'react-hot-toast';

interface ChatThreadPageProps {
  params: Promise<{ conversationId: string }>;
}

export default function ChatThreadPage({ params }: ChatThreadPageProps) {
  const resolvedParams = use(params);
  const conversationId = resolvedParams.conversationId;
  const { user } = useAuthStore();

  const {
    messages,
    setMessages,
    activeOffer,
    setActiveOffer,
    isTyping,
    hasScamAlert,
    sendMessage,
    sendTyping,
  } = useChatRoom(conversationId);

  const [inputContent, setInputContent] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Make Offer Modal State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerAmountInput, setOfferAmountInput] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Guard against invalid or undefined conversationId
  useEffect(() => {
    if (!conversationId || conversationId === 'undefined') {
      toast.error('অবৈধ চ্যাট লিঙ্ক');
      if (typeof window !== 'undefined') {
        window.location.href = '/chat';
      }
    }
  }, [conversationId]);

  // Initial Load: Fetch Message History & Existing Offers
  useEffect(() => {
    if (!conversationId || conversationId === 'undefined') return;

    async function loadData() {
      try {
        setIsLoadingMessages(true);
        const [msgRes, offerRes] = await Promise.all([
          chatApi.getMessages(conversationId),
          offerApi.getOffers(conversationId).catch(() => ({ data: { data: [] } })),
        ]);

        if (msgRes.data.success && msgRes.data.data) {
          setMessages(msgRes.data.data);
        }

        if (offerRes.data?.data && offerRes.data.data.length > 0) {
          // Latest offer
          setActiveOffer(offerRes.data.data[offerRes.data.data.length - 1]);
        }
      } catch {
        toast.error('চ্যাট হিস্ট্রি লোড করা সম্ভব হয়নি');
      } finally {
        setIsLoadingMessages(false);
      }
    }
    loadData();
  }, [conversationId, setMessages, setActiveOffer]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Client-side Link Sanitization before send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    // Strip external urls
    const sanitized = inputContent.replace(/(https?:\/\/[^\s]+)/g, '[লিংক লুকানো হয়েছে]');
    sendMessage(sanitized, 'text');
    setInputContent('');
  };

  // Submit Make Offer
  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmountInput) return;

    try {
      setIsSubmittingOffer(true);
      const res = await offerApi.makeOffer(conversationId, {
        amount: Number(offerAmountInput),
      });

      if (res.data.success && res.data.data) {
        setActiveOffer(res.data.data);
        toast.success('অফার পাঠানো হয়েছে!');
        setIsOfferModalOpen(false);
        setOfferAmountInput('');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'অফার দেওয়া সম্ভব হয়নি (সর্বোচ্চ ৩ রাউন্ড অনুমোদিত)';
      toast.error(msg);
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Accept Offer
  const handleAcceptOffer = async () => {
    if (!activeOffer) return;
    try {
      const res = await offerApi.acceptOffer(conversationId, activeOffer.id);
      if (res.data.success && res.data.data) {
        setActiveOffer(res.data.data);
        toast.success('অফার সফলভাবে গৃহীত হয়েছে! লিস্টিং আন্ডার অফারে স্থানান্তরিত।');
      }
    } catch {
      toast.error('অফার গ্রহণ করা সম্ভব হয়নি');
    }
  };

  // Decline Offer
  const handleDeclineOffer = async () => {
    if (!activeOffer) return;
    try {
      const res = await offerApi.declineOffer(conversationId, activeOffer.id);
      if (res.data.success && res.data.data) {
        setActiveOffer(res.data.data);
        toast.success('অফার বাতিল করা হয়েছে');
      }
    } catch {
      toast.error('অফার বাতিল করা সম্ভব হয়নি');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs h-[calc(100vh-140px)] flex flex-col">
      {/* Top Listing Context Header */}
      <header className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/chat"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                চ্যাট রুম
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>NID Verified</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">অনলাইন ও নিরাপদ মেসেজিং</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Report Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="রিপোর্ট করুন (Report conversation)"
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Flag className="w-4 h-4" />
          </button>

          {/* Make Offer Button */}
          <button
            onClick={() => setIsOfferModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>অফার দিন (Make Offer)</span>
          </button>
        </div>
      </header>

      {/* Scam Warning Banner (if detected or top pinned) */}
      {hasScamAlert && (
        <div className="p-3 border-b border-red-100 bg-red-50/50">
          <ScamWarningBanner />
        </div>
      )}

      {/* Messages Thread Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/40">
        {isLoadingMessages ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-slate-400">মেসেজ লোড হচ্ছে...</span>
          </div>
        ) : (
          <>
            {/* Active Inline Offer Card */}
            {activeOffer && user && (
              <OfferCard
                offer={activeOffer}
                currentUserId={user.id}
                onAccept={handleAcceptOffer}
                onDecline={handleDeclineOffer}
                onCounter={() => setIsOfferModalOpen(true)}
              />
            )}

            {/* Message List */}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isSentByMe={msg.senderId === user?.id}
              />
            ))}

            {/* Typing Indicator */}
            {isTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input Bottom Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 flex-shrink-0"
      >
        <button
          type="button"
          aria-label="Attach File"
          className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          placeholder="একটি বার্তা লিখুন... (Type a message...)"
          value={inputContent}
          onChange={(e) => {
            setInputContent(e.target.value);
            sendTyping();
          }}
          className="flex-1 px-4 py-2 text-xs rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
        />

        <button
          type="submit"
          disabled={!inputContent.trim()}
          className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-40 transition-transform active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Make / Counter Offer Modal Bottom Sheet */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                দরদাম করুন (Make Binding Offer)
              </h3>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              ৩-রাউন্ড অফার প্রোটোকল: বিক্রেতা গ্রহণ করলে চুক্তি নিশ্চিত হবে।
            </p>

            <form onSubmit={handleMakeOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  আপনার প্রস্তাবিত মূল্য (BDT ৳)
                </label>
                <input
                  type="number"
                  required
                  min={50}
                  placeholder="যেমন: 85000"
                  value={offerAmountInput}
                  onChange={(e) => setOfferAmountInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-extrabold rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingOffer || !offerAmountInput}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
              >
                {isSubmittingOffer ? 'পাঠানো হচ্ছে...' : 'অফার পাঠান (Submit Offer) →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        entityType="chat"
        entityId={conversationId}
      />
    </div>
  );
}

