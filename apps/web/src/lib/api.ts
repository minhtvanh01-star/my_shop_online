import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearAccessTokenCookie, setAccessTokenCookie } from '@/lib/auth-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let _token: string | null = null;
let _refreshToken: string | null = null;
let _refreshPromise: Promise<string> | null = null;

export const tokenManager = {
  get: () => _token,
  getRefresh: () => _refreshToken,
  set: (token: string | null) => {
    _token = token;
    if (typeof document === 'undefined') return;
    if (token) setAccessTokenCookie(token);
    else clearAccessTokenCookie();
  },
  setRefresh: (token: string | null) => {
    _refreshToken = token;
  },
};

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenManager.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const is401 = error.response?.status === 401;
    const isAuthHandshake =
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register');

    if (!is401 || original?._retry || isAuthHandshake) {
      return Promise.reject(error);
    }

    original._retry = true;
    const refreshToken = tokenManager.getRefresh();
    if (!refreshToken) {
      tokenManager.set(null);
      tokenManager.setRefresh(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
      return Promise.reject(error);
    }

    try {
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post<{ data: { accessToken: string; refreshToken?: string } }>(
            `${BASE_URL}/auth/refresh`,
            { refreshToken },
            { withCredentials: true },
          )
          .then((res) => {
            const nextAccess = res.data.data.accessToken;
            const nextRefresh = res.data.data.refreshToken;
            if (nextRefresh) tokenManager.setRefresh(nextRefresh);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('auth:tokens-refreshed', {
                  detail: { accessToken: nextAccess, refreshToken: nextRefresh },
                }),
              );
            }
            return nextAccess;
          })
          .finally(() => {
            _refreshPromise = null;
          });
      }

      const newToken = await _refreshPromise;
      tokenManager.set(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      tokenManager.set(null);
      tokenManager.setRefresh(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
      return Promise.reject(error);
    }
  },
);

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

export function getApiErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { code?: string })?.code;
  }
  return undefined;
}

export default api;
