'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import type { AuthTokens, User } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
}

interface AuthResponse {
  data: {
    user: User;
    accessToken: string;
  };
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: LoginCredentials) =>
      api.post<AuthResponse>('/auth/login', creds).then((r) => r.data.data),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (data: RegisterData) =>
      api.post<AuthResponse>('/auth/register', data).then((r) => r.data.data),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const { clearCart } = useCartStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      logout();
      clearCart();
      queryClient.clear();
      router.push('/');
    },
  });
}
