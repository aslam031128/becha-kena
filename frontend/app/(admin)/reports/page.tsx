'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminReportItem } from '@/lib/api/admin.api';
import {
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  User,
  Package,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'investigating' | 'actioned' | 'dismissed'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchReports = useCallback(async (status = statusFilter) => {
    try {
      setIsLoading(true);
      const res = await adminApi.getReports({ status });
      if (res.data?.success && res.data.data) {
        setReports(res.data.data);
      }
    } catch {
      toast.error('Failed to load community reports');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports(statusFilter);
  }, [statusFilter, fetchReports]);

  const handleAction = async (reportId: string, action: 'dismiss' | 'quarantine' | 'warn' | 'escalate') => {
    try {
      setActioningId(reportId);
      await adminApi.actionReport(reportId, action);
      toast.success(
        action === 'quarantine'
          ? 'Entity quarantined and report actioned'
          : `Report marked as ${action}`
      );
      // Remove from current list if looking at pending
      if (statusFilter === 'pending') {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        fetchReports();
      }
    } catch {
      toast.error('Failed to process report action');
    } finally {
      setActioningId(null);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'listing':
        return <Package className="w-4 h-4 text-emerald-400" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'user':
        return <User className="w-4 h-4 text-purple-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    }
  };

  const getEntityUrl = (type: string, id: string) => {
    switch (type) {
      case 'listing':
        return `/listing/${id}`;
      case 'chat':
        return `/chat/${id}`;
      case 'user':
        return `/user/${id}`;
      default:
        return '#';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Community Reports Triage
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {reports.length} items
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review user-flagged listings, scams, counterfeit goods, and community violations.
          </p>
        </div>

        <button
          onClick={() => fetchReports()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['pending', 'investigating', 'actioned', 'dismissed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
              statusFilter === status
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse space-y-3"
            >
              <div className="h-4 w-40 bg-slate-800 rounded-sm" />
              <div className="h-3 w-64 bg-slate-800 rounded-sm" />
              <div className="h-10 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-slate-200">No {statusFilter} reports</h3>
          <p className="text-xs text-slate-500 mt-1">
            Community moderation is up to date for this category.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isProcessing = actioningId === report.id;
            const targetUrl = getEntityUrl(report.entityType, report.entityId);

            return (
              <div
                key={report.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                      {getEntityIcon(report.entityType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          {report.entityType}
                        </span>
                        <span className="text-xs font-mono text-slate-500 truncate max-w-[200px]">
                          ID: {report.entityId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Reporter:{' '}
                        <span className="text-slate-200 font-medium">
                          {report.reporterName || 'Anonymous Citizen'}
                        </span>
                        {report.reporterId && (
                          <span className="text-slate-500 font-mono text-[11px] ml-1">
                            ({report.reporterId})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                    {targetUrl !== '#' && (
                      <Link
                        href={targetUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        <span>Inspect Target</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Reason & Details */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                      Reason
                    </span>
                    <span className="text-xs font-bold text-white">
                      {report.reason.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {report.details && (
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      &quot;{report.details}&quot;
                    </p>
                  )}
                </div>

                {/* Actions row */}
                {statusFilter === 'pending' && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleAction(report.id, 'dismiss')}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      Dismiss Report
                    </button>

                    <button
                      onClick={() => handleAction(report.id, 'escalate')}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      Investigate
                    </button>

                    <button
                      onClick={() => handleAction(report.id, 'quarantine')}
                      disabled={isProcessing}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                    >
                      {report.entityType === 'listing' ? 'Quarantine Listing' : 'Action Violation'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
