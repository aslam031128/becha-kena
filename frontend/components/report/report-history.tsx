'use client';

import React, { useEffect, useState } from 'react';
import { reportApi, ReportItem, ReportStatus, ReportReason } from '@/lib/api/report.api';
import { ShieldAlert, Clock, CheckCircle2, XCircle, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const reasonLabels: Record<ReportReason, { bn: string; en: string }> = {
  scam_advance_demanded: {
    bn: 'অগ্রিম টাকা দাবি',
    en: 'Advance payment scam',
  },
  stolen_goods_suspected: {
    bn: 'চুরি যাওয়া পণ্য সন্দেহ',
    en: 'Stolen goods suspected',
  },
  harassment: {
    bn: 'হয়রানি বা অসদাচরণ',
    en: 'Harassment',
  },
  counterfeit: {
    bn: 'নকল বা জাল পণ্য',
    en: 'Counterfeit product',
  },
  spam: {
    bn: 'স্প্যাম বা ভুয়া পোস্ট',
    en: 'Spam / Fake',
  },
};

const statusConfig: Record<ReportStatus, { labelBn: string; labelEn: string; className: string; icon: React.ReactNode }> = {
  pending: {
    labelBn: 'অপেক্ষমাণ',
    labelEn: 'Pending Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
  },
  investigating: {
    labelBn: 'তদন্ত চলছে',
    labelEn: 'Investigating',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Search className="w-3.5 h-3.5 text-blue-600" />,
  },
  actioned: {
    labelBn: 'ব্যবস্থা গৃহীত',
    labelEn: 'Actioned',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
  dismissed: {
    labelBn: 'খারিজ',
    labelEn: 'Dismissed',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
  },
};

export function ReportHistory() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportApi.getMyReports();
      setReports(res.data.data || []);
    } catch {
      setError('রিপোর্ট তালিকা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white animate-pulse">
            <div className="h-4 w-40 bg-slate-200 rounded-sm mb-2" />
            <div className="h-3 w-64 bg-slate-100 rounded-sm mb-3" />
            <div className="h-3 w-24 bg-slate-100 rounded-sm" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-center">
        <p className="text-xs text-red-700 font-medium mb-3">{error}</p>
        <button
          onClick={fetchReports}
          className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
        >
          পুনরায় চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6 text-slate-400" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 mb-1">
          কোনো রিপোর্ট দায়ের করা হয়নি
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          মার্কেটপ্লেসে কোনো অসাধু বা সন্দেহজনক কার্যক্রম দেখলে রিপোর্ট করুন। আপনার তথ্য গোপন রাখা হবে।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const id = report.reportId || report.id || '';
        const status = statusConfig[report.status] || statusConfig.pending;
        const reason = reasonLabels[report.reason] || { bn: report.reason, en: report.reason };

        let linkHref = '#';
        if (report.entityType === 'listing') {
          linkHref = `/listing/${report.entityId}`;
        } else if (report.entityType === 'chat') {
          linkHref = `/chat/${report.entityId}`;
        } else if (report.entityType === 'user') {
          linkHref = `/user/${report.entityId}`;
        }

        return (
          <div
            key={id}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                  {report.entityType}
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {reason.bn}
                </span>
                <span className="text-[11px] text-slate-400">
                  ({reason.en})
                </span>
              </div>

              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.className}`}
              >
                {status.icon}
                <span>{status.labelBn}</span>
              </div>
            </div>

            {report.details && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 leading-relaxed">
                {report.details}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
              <span>
                দায়েরের তারিখ:{' '}
                {new Date(report.createdAt).toLocaleDateString('bn-BD', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              {linkHref !== '#' && (
                <Link
                  href={linkHref}
                  target="_blank"
                  className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <span>আইটেম দেখুন</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

