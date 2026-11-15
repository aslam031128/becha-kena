import { create } from 'zustand';
import { User } from '@/lib/types/user.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user: User, token: string) =>
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
    }),

  setAccessToken: (token: string) =>
    set({
      accessToken: token,
      isAuthenticated: true,
    }),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  updateUser: (updates: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  setLoading: (isLoading: boolean) =>
    set({ isLoading }),
}));

