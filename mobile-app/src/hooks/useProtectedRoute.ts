import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

/**
 * Global navigation guard hook.
 * Enforces role-based access control and KYC verification checks.
 */
export function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isNidVerified, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && inTabsGroup) {
      // Guest trying to enter protected tabs -> redirect to login
      router.replace('/(auth)/login' as any);
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated citizen in login screen -> route based on KYC
      if (isNidVerified) {
        router.replace('/(tabs)/home' as any);
      } else {
        router.replace('/(auth)/kyc' as any);
      }
    }
  }, [isAuthenticated, isNidVerified, segments, isLoading]);
}
