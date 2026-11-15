'use client';

import React, { useState } from 'react';
import { useNotificationStore } from '@/lib/store/notification.store';
import { getNotificationIcon } from '@/components/notification/notification-dropdown';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export default function NotificationsCenterPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  // Group by date
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const todayItems = filteredNotifications.filter((n) => isToday(new Date(n.createdAt)));
  const yesterdayItems = filteredNotifications.filter((n) => isYesterday(new Date(n.createdAt)));
  const earlierItems = filteredNotifications.filter(
    (n) => !isToday(new Date(n.createdAt)) && !isYesterday(new Date(n.createdAt))
  );

  const renderGroup = (title: string, items: typeof notifications) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {title}
        </h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => markAsRead(item.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-start ${
                !item.isRead
                  ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                {getNotificationIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              নোটিফিকেশন সেন্টার (Notifications)
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            আপনার বিজ্ঞাপন, অফার, চ্যাট এবং অ্যাকাউন্টের সকল রিয়েল-টাইম আপডেট
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>সব পড়া হয়েছে চিহ্নিত করুন (Mark all read)</span>
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          সব ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          অপঠিত ({unreadCount})
        </button>
      </div>

      {/* Notification Lists */}
      {filteredNotifications.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-200 bg-white text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-slate-800">
            {filter === 'unread' ? 'কোনো অপঠিত নোটিফিকেশন নেই' : 'কোনো নোটিফিকেশন নেই'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            আপনার বিজ্ঞাপন বিক্রি, দাম হ্রাস বা নতুন চ্যাট বার্তা আসলে এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {renderGroup('আজ (Today)', todayItems)}
          {renderGroup('গতকাল (Yesterday)', yesterdayItems)}
          {renderGroup('পূর্বে (Earlier)', earlierItems)}
        </div>
      )}
    </div>
  );
}
