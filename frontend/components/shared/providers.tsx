'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/shared/auth-provider';
import { I18nProvider } from '@/lib/i18n/context';
import { OfflineBanner } from '@/components/shared/offline-banner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <OfflineBanner />
          {children}
          <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#22C55E',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);
}

