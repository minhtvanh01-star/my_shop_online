import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// ── Token manager ─────────────────────────────────────────────────────────────
// Kept in module scope so the axios interceptor can access it without
// importing from the Zustand store (prevents circular dependency).
let _token: string | null = null;
let _refreshPromise: Promise<string> | null = null;

export const tokenManager = {
  get: () => _token,
  set: (token: string | null) => {
    _token = token;
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach access token to outgoing requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenManager.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: attempt one silent token refresh, then retry the original request
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const is401 = error.response?.status === 401;
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (!is401 || original?._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      // Deduplicate: if a refresh is already in-flight, share the same promise
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post<{ data: { accessToken: string } }>(
            `${BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true },
          )
          .then((res) => res.data.data.accessToken)
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
      // Notify the app so it can redirect to login
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
      return Promise.reject(error);
    }
  },
);

// ── Typed helpers ─────────────────────────────────────────────────────────────
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

export default api;
