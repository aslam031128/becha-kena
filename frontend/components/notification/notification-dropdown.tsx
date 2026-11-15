'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  BadgeDollarSign,
  PartyPopper,
  Clock,
  TrendingDown,
  AlertTriangle,
  Handshake,
  Scale,
  Lock,
  Bell,
  Check,
} from 'lucide-react';
import { NotificationItem } from '@/lib/store/notification.store';

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function getNotificationIcon(type: string) {
  switch (type) {
    case 'kyc_approved':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'kyc_rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'new_message':
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    case 'offer_received':
      return <BadgeDollarSign className="w-4 h-4 text-amber-500" />;
    case 'offer_accepted':
      return <PartyPopper className="w-4 h-4 text-purple-500" />;
    case 'offer_expired':
      return <Clock className="w-4 h-4 text-slate-400" />;
    case 'price_drop':
      return <TrendingDown className="w-4 h-4 text-emerald-600" />;
    case 'listing_expiry':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'deal_completed':
      return <Handshake className="w-4 h-4 text-emerald-600" />;
    case 'dispute_filed':
      return <Scale className="w-4 h-4 text-red-600" />;
    case 'new_device_login':
      return <Lock className="w-4 h-4 text-indigo-500" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500" />;
  }
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationDropdownProps) {
  const displayItems = notifications.slice(0, 10);

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              {unreadCount} new
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List (Top 10) */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {displayItems.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
            <p className="font-medium text-slate-600">No new notifications</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Updates about offers, chats, and KYC will show up here.
            </p>
          </div>
        ) : (
          displayItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onMarkAsRead(item.id)}
              className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 items-start ${
                !item.isRead ? 'bg-emerald-50/40' : ''
              }`}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                {getNotificationIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {item.title}
                  </p>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300" />
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 px-4 border-t border-slate-100 text-center">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 block py-1"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}

