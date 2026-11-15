'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    // Handle single character
    const char = val.slice(-1);
    const otpArray = value.split('');
    otpArray[index] = char;
    const newOtp = otpArray.join('');
    onChange(newOtp);

    // Focus next input if not at the end
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.length === 6 && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const otpArray = value.split('');
        otpArray[index] = '';
        onChange(otpArray.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      onChange(pastedData);
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      if (pastedData.length === 6 && onComplete) {
        onComplete(pastedData);
      }
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 sm:gap-3 ${
        hasError ? 'animate-shake' : ''
      }`}
    >
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={`w-11 sm:w-12 h-13 sm:h-14 text-center text-xl font-bold rounded-xl border bg-white focus:outline-none transition-all ${
            hasError
              ? 'border-red-500 text-red-600 focus:ring-2 focus:ring-red-200'
              : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-slate-900'
          } disabled:bg-slate-50 disabled:text-slate-400`}
        />
      ))}
    </div>
  );
}

