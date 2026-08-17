'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api, { tokenManager } from '@/lib/api';
import { mergeGuestCartToServer } from '@/hooks/useCart';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import type { User, UserRole } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
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
      api.post<{ data: AuthPayload }>('/auth/login', creds).then((r) => r.data.data),
    onSuccess: async ({ user, accessToken, refreshToken }) => {
      const guestItems = useCartStore.getState().items;
      setAuth(toUser(user), accessToken, refreshToken);
      if (guestItems.length > 0) {
        try {
          await mergeGuestCartToServer(guestItems);
        } catch {
          /* keep local cart if merge fails */
        }
      }
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterData) =>
      api.post<{ data: AuthPayload }>('/auth/register', data).then((r) => r.data.data),
    onSuccess: async ({ user, accessToken, refreshToken }) => {
      const guestItems = useCartStore.getState().items;
      setAuth(toUser(user), accessToken, refreshToken);
      if (guestItems.length > 0) {
        try {
          await mergeGuestCartToServer(guestItems);
        } catch {
          /* keep local cart if merge fails */
        }
      }
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const { clearCart } = useCartStore();
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
      clearCart();
      queryClient.clear();
      router.push('/');
    },
  });
}
