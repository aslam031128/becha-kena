'use client';

import React from 'react';
import {
  Code2,
  ShieldAlert,
  Headphones,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Mail,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function CareersPage() {
  const { t } = useTranslation();

  const c = t.careers;

  const jobs = [
    {
      id: 'swe-fullstack',
      icon: <Code2 className="w-5 h-5 text-emerald-600" />,
      title: c.job1Title,
      department: c.job1Dept,
      location: c.job1Loc,
      type: c.job1Type,
      desc: c.job1Desc,
      skills: ['Next.js 15 (App Router)', 'Node.js / Express / TypeScript', 'MongoDB & Redis', 'WebSockets / Socket.io'],
    },
    {
      id: 'trust-safety-lead',
      icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
      title: c.job2Title,
      department: c.job2Dept,
      location: c.job2Loc,
      type: c.job2Type,
      desc: c.job2Desc,
      skills: ['KYC / AML Experience', 'Fraud Detection', 'Operations Management', 'Legal Compliance'],
    },
    {
      id: 'customer-happiness',
      icon: <Headphones className="w-5 h-5 text-blue-600" />,
      title: c.job3Title,
      department: c.job3Dept,
      location: c.job3Loc,
      type: c.job3Type,
      desc: c.job3Desc,
      skills: ['Communication & Empathy', 'Conflict Resolution', 'Customer Support Tools'],
    },
  ];

  const perks = [
    { title: c.perkSalaryTitle, desc: c.perkSalaryDesc },
    { title: c.perkInsuranceTitle, desc: c.perkInsuranceDesc },
    { title: c.perkHybridTitle, desc: c.perkHybridDesc },
    { title: c.perkCultureTitle, desc: c.perkCultureDesc },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{c.hiringBadge}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            {c.heroTitle}
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            {c.heroSubtitle}
          </p>
        </div>

        {/* Perks Grid */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 text-center">
            {c.whyUsTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {perks.map((p, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-2 text-center sm:text-left"
              >
                <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Open Positions List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {c.openPositions}
              </h2>
              <p className="text-xs text-slate-500">
                {c.openPositionsSub}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
              {jobs.length} Positions
            </span>
          </div>

          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex-shrink-0">
                      {job.icon}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">{job.title}</h3>
                      <p className="text-xs text-emerald-700 font-semibold">{job.department}</p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {job.desc}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {job.type}
                    </span>
                  </div>

                  {/* Skills Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-shrink-0 w-full md:w-auto">
                  <a
                    href="mailto:careers@becha-kena.com?subject=Job%20Application"
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>{c.applyNow}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Application Footer CTA */}
        <div className="p-8 rounded-3xl bg-slate-900 text-white text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">
              {c.noMatchTitle}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {c.noMatchDesc}
            </p>
          </div>
          <div>
            <a
              href="mailto:careers@becha-kena.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md"
            >
              <Mail className="w-4 h-4" />
              <span>careers@becha-kena.com</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
