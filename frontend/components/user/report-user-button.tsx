'use client';

import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { ReportModal } from '@/components/report/report-modal';

interface ReportUserButtonProps {
  userId: string;
}

export function ReportUserButton({ userId }: ReportUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 text-xs font-semibold transition-colors"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>ইউজার রিপোর্ট করুন (Report User)</span>
      </button>

      <ReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entityType="user"
        entityId={userId}
      />
    </>
  );
}

