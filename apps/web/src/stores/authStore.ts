'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { readAccessTokenCookie } from '@/lib/auth-cookie';
import { tokenManager } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  _hasHydrated: boolean;
}

interface AuthActions {
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  _setHydrated: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: false,

      setAuth: (user, accessToken, refreshToken) => {
        tokenManager.set(accessToken);
        tokenManager.setRefresh(refreshToken);
        set({ user, accessToken, refreshToken });
      },

      setAccessToken: (token) => {
        tokenManager.set(token);
        set({ accessToken: token });
      },

      setRefreshToken: (token) => {
        tokenManager.setRefresh(token);
        set({ refreshToken: token });
      },

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },

      logout: () => {
        tokenManager.set(null);
        tokenManager.setRefresh(null);
        set({ user: null, accessToken: null, refreshToken: null });
      },

      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : memoryStorage(),
      ),
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        const access = readAccessTokenCookie();
        if (access) tokenManager.set(access);
        if (state?.refreshToken) tokenManager.setRefresh(state.refreshToken);
        useAuthStore.setState({
          _hasHydrated: true,
          ...(access ? { accessToken: access } : {}),
        });
      },
    },
  ),
);

export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
export const useIsAdmin = () =>
  useAuthStore(
    (s) => s.user?.role === 'ADMIN' || s.user?.role === 'SUPER_ADMIN',
  );
export const useHasHydrated = () => useAuthStore((s) => s._hasHydrated);

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}
