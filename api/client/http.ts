import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { getStoredToken } from './authToken';

const apiOrigin =
  (Constants.expoConfig?.extra as { apiOrigin?: string } | undefined)?.apiOrigin ??
  'http://localhost:3000';

type ApiError = {
  message?: string;
  statusCode?: number;
  error?: string;
};

/**
 * Per-request opt-out of the interceptor's error toasts, for callers that
 * handle failure themselves (e.g. a short-timeout fetch with a graceful
 * fallback — the fallback working and a red banner appearing contradict).
 * 401 handling is never suppressed.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressErrorToast?: boolean;
  }
}

type Unauthorized401Handler = () => void;
let onUnauthorized: Unauthorized401Handler | null = null;
export function setUnauthorizedHandler(handler: Unauthorized401Handler | null) {
  onUnauthorized = handler;
}

let inMemoryToken: string | null = null;
export function setInMemoryToken(token: string | null) {
  inMemoryToken = token;
}
export function getInMemoryToken(): string | null {
  return inMemoryToken;
}

export const http: AxiosInstance = axios.create({
  baseURL: apiOrigin,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = inMemoryToken ?? (await getStoredToken());
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
      data?.message ?? data?.error ?? error.message ?? 'Network error';
    const suppress = error.config?.suppressErrorToast === true;

    if (status === 401) {
      onUnauthorized?.();
    } else if (suppress) {
      // Caller owns the failure UX — no toast, but still reject.
    } else if (status === 403) {
      Toast.show({
        type: 'error',
        text1: 'Access denied',
        text2: 'You do not have permission to perform this action.',
      });
    } else if (status === 429) {
      Toast.show({
        type: 'error',
        text1: 'Too many requests',
        text2: 'Please slow down and try again in a moment.',
      });
    } else if (status === undefined) {
      // No response at all — timeout, offline, DNS. Not the server's fault,
      // and calling it "Server error" misdiagnoses it for the user.
      Toast.show({
        type: 'error',
        text1: 'Connection problem',
        text2: String(message),
      });
    } else if (status >= 500) {
      Toast.show({
        type: 'error',
        text1: 'Server error',
        text2: String(message),
      });
    }

    return Promise.reject(error);
  },
);

export function getApiOrigin(): string {
  return apiOrigin;
}
