'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api, { tokenManager } from '@/lib/api';
import { mergeGuestCartToServer } from '@/hooks/useCart';
import { isStaffRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import type { User, UserRole } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
  portal?: 'customer' | 'staff';
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  locale?: string;
}

interface AuthPayload {
  user: Partial<User> & { id: string; email: string; fullName: string; role: string };
  accessToken: string;
  refreshToken: string;
}

async function applySession(
  setAuth: (user: User, accessToken: string, refreshToken: string) => void,
  queryClient: ReturnType<typeof useQueryClient>,
  payload: AuthPayload,
  mergeCart: boolean,
) {
  const guestItems = useCartStore.getState().items;
  setAuth(toUser(payload.user), payload.accessToken, payload.refreshToken);
  if (mergeCart && guestItems.length > 0) {
    try {
      await mergeGuestCartToServer(guestItems);
    } catch {
      /* keep local cart if merge fails */
    }
  }
  queryClient.invalidateQueries({ queryKey: ['cart'] });
}

function toUser(raw: AuthPayload['user']): User {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName,
    phone: raw.phone ?? null,
    avatar: raw.avatar ?? null,
    role: (raw.role as UserRole) || 'CUSTOMER',
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: LoginCredentials) =>
      api
        .post<{ data: AuthPayload }>('/auth/login', {
          email: creds.email,
          password: creds.password,
          portal: creds.portal ?? 'customer',
        })
        .then((r) => r.data.data),
    onSuccess: async (payload) => {
      await applySession(setAuth, queryClient, payload, !isStaffRole(payload.user.role));
    },
  });
}

export function useGoogleLogin() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { idToken: string; locale?: string }) =>
      api
        .post<{ data: AuthPayload }>('/auth/google', {
          idToken: input.idToken,
          portal: 'customer',
          locale: input.locale,
        })
        .then((r) => r.data.data),
    onSuccess: async (payload) => {
      await applySession(setAuth, queryClient, payload, true);
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterData) =>
      api.post<{ data: AuthPayload }>('/auth/register', data).then((r) => r.data.data),
    onSuccess: async (payload) => {
      await applySession(setAuth, queryClient, payload, true);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenManager.getRefresh();
      if (!refreshToken) return;
      await api.post('/auth/logout', { refreshToken });
    },
    onSettled: () => {
      logout();
      queryClient.clear();
      router.push('/');
    },
  });
}
