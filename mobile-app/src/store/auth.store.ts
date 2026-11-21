import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, KycStatus, OtpResponse } from '@/types/user.types';
import { authApi } from '@/services/api/auth.api';
import { saveTokens, clearTokens, getAccessToken } from '@/utils/storage';
import { parseApiError } from '@/services/api/client';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNidVerified: boolean;
  kycStatus: KycStatus;
  error: string | null;
  pendingPhone: string | null;
  resendCooldownSeconds: number;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  requestOtp: (phone: string) => Promise<OtpResponse>;
  login: (phone: string, otp: string) => Promise<{ isNewUser: boolean; isNewDeviceChallengeRequired?: boolean }>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  setPendingPhone: (phone: string | null) => void;
  setResendCooldown: (seconds: number) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      isNidVerified: false,
      kycStatus: 'unverified',
      error: null,
      pendingPhone: null,
      resendCooldownSeconds: 0,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isNidVerified: user?.isNidVerified ?? false,
          kycStatus: user?.kycStatus ?? 'unverified',
        });
      },

      setToken: (token) => {
        set({ accessToken: token });
      },

      setPendingPhone: (phone) => {
        set({ pendingPhone: phone });
      },

      setResendCooldown: (seconds) => {
        set({ resendCooldownSeconds: seconds });
      },

      requestOtp: async (phone: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.requestOtp(phone);
          const data = response.data;
          set({
            pendingPhone: phone,
            resendCooldownSeconds: data.resendCooldownSeconds || 60,
            isLoading: false,
            error: null,
          });
          return data;
        } catch (err: any) {
          const errorMsg = parseApiError(err);
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }
      },

      login: async (phone: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.verifyOtp({ phone, otp });
          const { accessToken, user, isNewUser, isNewDeviceChallengeRequired } = response.data;

          // Store cryptographic session tokens strictly in SecureStore
          await saveTokens(accessToken);

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isNidVerified: user.isNidVerified,
            kycStatus: user.kycStatus,
            isLoading: false,
            error: null,
            pendingPhone: null,
            resendCooldownSeconds: 0,
          });

          return { isNewUser, isNewDeviceChallengeRequired };
        } catch (err: any) {
          const errorMsg = parseApiError(err);
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch {
          // Ignore network errors during logout
        } finally {
          await clearTokens();
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isNidVerified: false,
            kycStatus: 'unverified',
            isLoading: false,
            error: null,
            pendingPhone: null,
            resendCooldownSeconds: 0,
          });
        }
      },

      checkAuthState: async () => {
        set({ isLoading: true });
        try {
          const token = await getAccessToken();
          if (!token) {
            set({ isAuthenticated: false, user: null, accessToken: null, isLoading: false });
            return;
          }

          // Statistically validate session against backend
          const response = await authApi.getCurrentUser();
          const user = response.data;

          set({
            user,
            accessToken: token,
            isAuthenticated: true,
            isNidVerified: user.isNidVerified,
            kycStatus: user.kycStatus,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          // If token expired or unauthorized, try auto refresh or clear
          await clearTokens();
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isNidVerified: false,
            kycStatus: 'unverified',
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'becha-kena-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive user profile data in AsyncStorage (tokens stay in SecureStore)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isNidVerified: state.isNidVerified,
        kycStatus: state.kycStatus,
      }),
    }
  )
);
