'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { useIsAuthenticated } from '@/stores/authStore';
import type { CartItem } from '@/types';

// Fetch server cart when authenticated
export function useServerCart() {
  const isAuthenticated = useIsAuthenticated();
  const { syncFromServer } = useCartStore();

  return useQuery({
    queryKey: ['cart'],
    queryFn: () =>
      api.get<{ data: CartItem[] }>('/cart').then((r) => {
        syncFromServer(r.data.data);
        return r.data.data;
      }),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

// Sync local cart → server after login
export function useSyncCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: CartItem[]) =>
      api.post('/cart/sync', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
