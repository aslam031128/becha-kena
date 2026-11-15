'use client';

import React from 'react';
import { Check, ShieldCheck, Camera, Sparkles } from 'lucide-react';

interface KycProgressStepsProps {
  currentStep: number; // 1: NID, 2: Selfie, 3: Processing, 4: Done
}

export function KycProgressSteps({ currentStep }: KycProgressStepsProps) {
  const steps = [
    { id: 0, label: 'Phone', labelBn: 'ফোন', icon: Check, completed: true },
    { id: 1, label: 'NID Card', labelBn: 'জাতীয় পরিচয়পত্র', icon: ShieldCheck, completed: currentStep > 1 },
    { id: 2, label: 'Live Selfie', labelBn: 'সেলফি', icon: Camera, completed: currentStep > 2 },
    { id: 3, label: 'Complete', labelBn: 'সম্পন্ন', icon: Sparkles, completed: currentStep >= 4 },
  ];

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative max-w-md mx-auto">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-10" />

        {steps.map((step) => {
          const Icon = step.icon;
          const isCurrent = currentStep === step.id;
          const isDone = step.completed;

          return (
            <div key={step.id} className="flex flex-col items-center gap-1.5 bg-white px-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : isCurrent
                    ? 'bg-emerald-100 text-emerald-800 ring-4 ring-emerald-50 border-2 border-emerald-500'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight ${
                  isCurrent ? 'text-emerald-700' : isDone ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step.labelBn}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

