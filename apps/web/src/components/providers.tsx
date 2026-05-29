'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min — balance freshness vs. requests
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Singleton on server, fresh instance per client render
let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // Listen for token expiry events dispatched by the api interceptor
  const logoutRef = useRef(useAuthStore.getState().logout);
  useEffect(() => {
    logoutRef.current = useAuthStore.getState().logout;
  });

  useEffect(() => {
    const handler = () => {
      logoutRef.current();
      // Optionally redirect to login — handled by middleware on next navigation
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
