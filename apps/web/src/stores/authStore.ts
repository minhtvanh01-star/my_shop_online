'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { tokenManager } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  _hasHydrated: boolean;
}

interface AuthActions {
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
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
      _hasHydrated: false,

      setAuth: (user, accessToken) => {
        tokenManager.set(accessToken);
        set({ user, accessToken });
      },

      setAccessToken: (token) => {
        tokenManager.set(token);
        set({ accessToken: token });
      },

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },

      logout: () => {
        tokenManager.set(null);
        set({ user: null, accessToken: null });
      },

      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : memoryStorage(),
      ),
      // Only persist user data and token — exclude internal state
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-sync the token manager after page reload
          if (state.accessToken) tokenManager.set(state.accessToken);
          state._setHydrated();
        }
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────────
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
export const useIsAdmin = () =>
  useAuthStore(
    (s) => s.user?.role === 'ADMIN' || s.user?.role === 'SUPER_ADMIN',
  );
export const useHasHydrated = () => useAuthStore((s) => s._hasHydrated);

// ── SSR-safe memory storage fallback ─────────────────────────────────────────
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}
