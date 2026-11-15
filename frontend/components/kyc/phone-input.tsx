'use client';

import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  error,
  disabled = false,
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric input, max 10 digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
  };

  return (
    <div className="w-full">
      <div
        className={`flex items-center w-full rounded-xl border bg-white overflow-hidden transition-all focus-within:ring-2 ${
          error
            ? 'border-red-500 focus-within:ring-red-200'
            : 'border-slate-200 focus-within:border-emerald-500 focus-within:ring-emerald-200'
        }`}
      >
        <span className="px-3.5 py-3 bg-slate-50 text-slate-500 font-semibold text-sm border-r border-slate-200 select-none">
          +880
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="1XXXXXXXXX"
          className="flex-1 px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 font-medium tracking-wide focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

