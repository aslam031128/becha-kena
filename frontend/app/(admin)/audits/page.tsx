'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, PhoneRevealAuditItem } from '@/lib/api/admin.api';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminPhoneAuditsPage() {
  const [audits, setAudits] = useState<PhoneRevealAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAudits = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getPhoneRevealAudits();
      if (res.data?.success && res.data.data) {
        setAudits(res.data.data);
      }
    } catch {
      toast.error('Failed to load phone reveal audits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const anomalyCount = audits.filter((a) => a.isAnomaly || a.revealCount > 8).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Phone Reveal Anomaly Detection
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {audits.length} monitored buyers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Forensic monitoring detecting aggressive phone number harvesting bots (&gt;8 reveals/24h threshold).
          </p>
        </div>

        <button
          onClick={fetchAudits}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Monitored Today
          </span>
          <span className="text-2xl font-extrabold text-white mt-1 block">
            {audits.length}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Flagged Anomalies (&gt;8/day)
          </span>
          <span
            className={`text-2xl font-extrabold mt-1 block ${
              anomalyCount > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {anomalyCount}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Security Rule Enforcement
          </span>
          <span className="text-xs text-slate-300 mt-2 block font-medium">
            Rolling 24h window · Auto-alert triggered on threshold
          </span>
        </div>
      </div>

      {/* Audits Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-slate-900 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : audits.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-slate-200">No Phone Reveals Recorded Today</h3>
          <p className="text-xs text-slate-500 mt-1">
            Phone reveal activity will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Buyer Dossier</th>
                  <th className="py-3.5 px-4 font-bold">Verification</th>
                  <th className="py-3.5 px-4 font-bold">Reveals (Past 24h)</th>
                  <th className="py-3.5 px-4 font-bold">IP Addresses</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Sanction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {audits.map((item) => {
                  const isFlagged = item.isAnomaly || item.revealCount > 8;

                  return (
                    <tr
                      key={item.buyerId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isFlagged ? 'bg-red-500/5' : ''
                      }`}
                    >
                      {/* Buyer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isFlagged
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isFlagged ? (
                              <Bot className="w-4 h-4" />
                            ) : (
                              item.displayName?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white">
                              {item.displayName || 'Unknown Buyer'}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {item.phone || item.buyerId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Verification */}
                      <td className="py-3.5 px-4">
                        {item.isNidVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Unverified</span>
                        )}
                      </td>

                      {/* Reveal Count */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isFlagged ? 'text-red-400' : 'text-slate-200'
                            }`}
                          >
                            {item.revealCount} reveals
                          </span>
                          {isFlagged && (
                            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-sm bg-red-500/20 text-red-400 border border-red-500/30">
                              Limit Exceeded
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IPs */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-slate-400">
                          {item.ipAddresses && item.ipAddresses.length > 0
                            ? item.ipAddresses.join(', ')
                            : 'Standard Gateway'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Potential Bot Anomaly</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Normal Activity</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/users/${item.buyerId}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isFlagged
                              ? 'bg-red-600 hover:bg-red-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <span>Inspect Citizen</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
