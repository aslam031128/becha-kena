'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // SW registered successfully
        })
        .catch(() => {
          // SW registration failed
        });
    }
  }, []);

  return null;
}

