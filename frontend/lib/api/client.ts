import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/store/auth.store';
import toast from 'react-hot-toast';

export const getDynamicApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In browser, use relative path '/api/v1' which Next.js rewrites to http://localhost:5000/api/v1.
    // This eliminates LAN network latency, Windows firewall port 5000 hangs, and CORS issues on mobile devices.
    return '/api/v1';
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
};

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Send HTTP-Only refresh cookie
  timeout: 30000, // 30-second timeout to prevent hanging requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Device UUID persistence in localStorage
export function getOrCreateDeviceUUID(): string {
  if (typeof window === 'undefined') return 'server-ssr';
  let deviceUUID = localStorage.getItem('bk_device_uuid');
  if (!deviceUUID) {
    deviceUUID = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'device-' + Date.now();
    localStorage.setItem('bk_device_uuid', deviceUUID);
  }
  return deviceUUID;
}

// Request interceptor: attach Bearer token and X-Device-UUID
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof window !== 'undefined') {
      config.headers['X-Device-UUID'] = getOrCreateDeviceUUID();

      // Automatically route API requests to the matching LAN host when accessing from mobile (e.g. 192.168.x.x)
      config.baseURL = getDynamicApiBaseUrl();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: silent token refresh and error handling
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const statusCode = error.response?.status;
    const errorCode = error.response?.data?.error?.code;

    // Handle 401 Unauthorized / Token Expiration
    if (statusCode === 401 && !originalRequest._retry) {
      // Avoid looping if the refresh endpoint itself failed with 401
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${getDynamicApiBaseUrl()}/auth/refresh-token`,
          {},
          { withCredentials: true, timeout: 15000 }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        if (newAccessToken) {
          useAuthStore.getState().setAccessToken(newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('No access token returned from refresh');
        }
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') {
          const pathname = window.location.pathname;
          const isPublicRoute =
            pathname === '/' ||
            pathname.startsWith('/search') ||
            pathname.startsWith('/listing/') ||
            pathname.startsWith('/categories/') ||
            pathname.startsWith('/user/') ||
            pathname.startsWith('/login');

          if (!isPublicRoute) {
            window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Account Banned
    if (statusCode === 403 && (errorCode === 'ACCOUNT_BANNED' || errorCode === 'USER_BANNED')) {
      toast.error('আপনার একাউন্টটি সাময়িকভাবে নিষিদ্ধ (Banned) করা হয়েছে।');
      return Promise.reject(error);
    }

    // Handle 403 Account Frozen
    if (statusCode === 403 && (errorCode === 'ACCOUNT_FROZEN' || errorCode === 'USER_FROZEN')) {
      toast.error('আপনার একাউন্টটি স্থগিত (Frozen) করা হয়েছে। সাপোর্টে যোগাযোগ করুন।');
      return Promise.reject(error);
    }

    // Handle 429 Rate Limit
    if (statusCode === 429) {
      toast.error(
        error.response?.data?.error?.message ||
          'অনেক বেশি অনুরোধ এসেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
      );
      return Promise.reject(error);
    }

    // Handle 5xx Server Errors
    if (statusCode && statusCode >= 500) {
      toast.error('সার্ভারে সাময়িক সমস্যা হচ্ছে। একটু পর আবার চেষ্টা করুন।');
    }

    return Promise.reject(error);
  }
);

