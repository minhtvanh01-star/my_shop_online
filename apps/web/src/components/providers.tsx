'use client';

import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import api, { tokenManager } from '@/lib/api';
import { readAccessTokenCookie } from '@/lib/auth-cookie';
import { ShopSettingsProvider } from '@/components/storefront/ShopSettingsProvider';
import { useAuthStore } from '@/stores/authStore';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

function AuthSessionBootstrap() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const logout = useAuthStore((s) => s.logout);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);

  useEffect(() => {
    if (!hasHydrated) return;

    const { refreshToken } = useAuthStore.getState();
    const access = readAccessTokenCookie();
    if (access) tokenManager.set(access);
    if (refreshToken) tokenManager.setRefresh(refreshToken);

    if (!access && refreshToken) {
      api
        .post<{ data: { accessToken: string; refreshToken?: string } }>('/auth/refresh', { refreshToken })
        .then((res) => {
          const nextAccess = res.data.data.accessToken;
          const nextRefresh = res.data.data.refreshToken;
          setAccessToken(nextAccess);
          if (nextRefresh) setRefreshToken(nextRefresh);
        })
        .catch(() => {
          logout();
        });
    }
  }, [hasHydrated, logout, setAccessToken, setRefreshToken]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const logoutRef = useRef(useAuthStore.getState().logout);

  useEffect(() => {
    logoutRef.current = useAuthStore.getState().logout;
  });

  useEffect(() => {
    const onExpired = () => {
      logoutRef.current();
    };
    const onRefreshed = (event: Event) => {
      const detail = (event as CustomEvent<{ accessToken: string; refreshToken?: string }>).detail;
      if (!detail?.accessToken) return;
      useAuthStore.getState().setAccessToken(detail.accessToken);
      if (detail.refreshToken) useAuthStore.getState().setRefreshToken(detail.refreshToken);
    };
    window.addEventListener('auth:session-expired', onExpired);
    window.addEventListener('auth:tokens-refreshed', onRefreshed);
    return () => {
      window.removeEventListener('auth:session-expired', onExpired);
      window.removeEventListener('auth:tokens-refreshed', onRefreshed);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <ShopSettingsProvider>
          <AuthSessionBootstrap />
          {children}
        </ShopSettingsProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
