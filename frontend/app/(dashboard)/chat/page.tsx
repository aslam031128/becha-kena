'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ShieldCheck, Clock, Search, ArrowRight } from 'lucide-react';
import { Conversation } from '@/lib/types/chat.types';
import { chatApi } from '@/lib/api/chat.api';
import toast from 'react-hot-toast';

export default function ChatInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function loadConversations() {
      try {
        setIsLoading(true);
        const res = await chatApi.getConversations();
        if (res.data.success && res.data.data) {
          setConversations(res.data.data);
        }
      } catch {
        toast.error('বার্তা তালিকা লোড করতে ব্যর্থ হয়েছে');
      } finally {
        setIsLoading(false);
      }
    }
    loadConversations();
  }, []);

  const filteredConversations = conversations.filter((c) =>
    (c.counterpart.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.listing.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs min-h-[600px] flex flex-col md:flex-row">
      {/* Left List Pane (Full on mobile, 35% on desktop) */}
      <div className="w-full md:w-96 border-r border-slate-200 flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>বার্তা ইনবক্স (Messages)</span>
            </h1>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {conversations.length} chats
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="চ্যাট বা পণ্য খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs text-slate-400">ইনবক্স লোড হচ্ছে...</span>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((item) => {
              const convoId = item.id || item.conversationId;
              return (
                <div
                  key={convoId}
                  onClick={() => router.push(`/chat/${convoId}`)}
                  className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 items-center"
                >
                {/* Counterpart Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                    {item.counterpart.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {item.counterpart.isNidVerified && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 absolute -bottom-0.5 -right-0.5 bg-white rounded-full" />
                  )}
                </div>

                {/* Info & Message Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.counterpart.displayName || 'ব্যবহারকারী'}
                    </h4>
                    {item.lastMessage && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-semibold text-emerald-700 truncate">
                    {item.listing.title} · ৳{item.listing.price.toLocaleString()}
                  </p>

                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[11px] text-slate-500 truncate max-w-[80%]">
                      {item.lastMessage ? (item.lastMessage.content || item.lastMessage.text) : 'চ্যাট শুরু করুন...'}
                    </p>
                    {item.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs px-4">
              কোনো সক্রিয় চ্যাট নেই। পণ্য পেজ থেকে &#34;চ্যাট করুন&#34; চাপুন।
            </div>
          )}
        </div>
      </div>

      {/* Right Pane Placeholder (Desktop only) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          একটি চ্যাট কথোপকথন নির্বাচন করুন
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
          বাম পাশের তালিকা থেকে কথোপকথন সিলেক্ট করে সরাসরি রিয়েল-টাইমে বার্তা পাঠান অথবা নিরাপদ অফার দরদাম করুন।
        </p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
        >
          <span>পণ্য ব্রাউজ করুন</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

