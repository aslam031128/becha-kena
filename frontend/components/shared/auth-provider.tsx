'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/use-auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Invoking useAuth initiates silent session restoration via HTTP-Only cookie and Zustand
  useAuth();
  return <>{children}</>;
}

export { useAuth };
