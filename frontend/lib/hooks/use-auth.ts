'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { User } from '@/lib/types/user.types';

export function useAuth() {
  const { user, accessToken, isAuthenticated, isLoading, setAuth, clearAuth, updateUser, setLoading } =
    useAuthStore();

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authApi.getProfile();
      if (res.data.success && res.data.data) {
        updateUser(res.data.data);
      }
    } catch {
      // Ignore profile fetch failure if session invalid
    } finally {
      setLoading(false);
    }
  }, [setLoading, updateUser]);

  const initSession = useCallback(async () => {
    // Attempt silent token refresh via HTTP-Only cookie on application load
    if (!accessToken) {
      try {
        setLoading(true);
        const refreshRes = await authApi.refreshToken();
        if (refreshRes.data.success && refreshRes.data.data.accessToken) {
          const newToken = refreshRes.data.data.accessToken;
          useAuthStore.getState().setAccessToken(newToken);
          const profileRes = await authApi.getProfile();
          if (profileRes.data.success && profileRes.data.data) {
            setAuth(profileRes.data.data, newToken);
          }
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [accessToken, clearAuth, setAuth, setLoading]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const login = useCallback(
    (userData: User, token: string) => {
      setAuth(userData, token);
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed with local logout regardless of network response
    } finally {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [clearAuth]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshProfile,
  };
}

