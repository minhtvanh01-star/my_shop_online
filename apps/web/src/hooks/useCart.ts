'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import api from '@/lib/api';
import { mapApiCartLine, type ApiCartLine } from '@/lib/catalog';
import { useCartStore } from '@/stores/cartStore';
import { useIsAuthenticated } from '@/stores/authStore';
import type { CartItem } from '@/types';

export function useServerCart() {
  const isAuthenticated = useIsAuthenticated();
  const locale = useLocale();
  const syncFromServer = useCartStore((s) => s.syncFromServer);

  return useQuery({
    queryKey: ['cart', locale],
    queryFn: async () => {
      const rows = await api
        .get<{ data: ApiCartLine[] }>('/cart', { params: { locale } })
        .then((r) => r.data.data);
      const mapped = rows.map(mapApiCartLine);
      syncFromServer(mapped);
      return mapped;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useAddToCart() {
  const isAuthenticated = useIsAuthenticated();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);

  return useMutation({
    mutationFn: async (item: Omit<CartItem, 'cartItemId'>) => {
      if (!isAuthenticated) {
        addItem(item);
        return;
      }
      await api.post('/cart/items', {
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
      });
      await queryClient.invalidateQueries({ queryKey: ['cart', locale] });
    },
  });
}

export function useUpdateCartQuantity() {
  const isAuthenticated = useIsAuthenticated();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  return useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      if (!isAuthenticated) {
        updateQuantity(cartItemId, quantity);
        return;
      }
      if (quantity <= 0) {
        await api.delete(`/cart/items/${cartItemId}`);
      } else {
        await api.put(`/cart/items/${cartItemId}`, { quantity });
      }
      await queryClient.invalidateQueries({ queryKey: ['cart', locale] });
    },
  });
}

export function useRemoveCartItem() {
  const isAuthenticated = useIsAuthenticated();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const removeItem = useCartStore((s) => s.removeItem);

  return useMutation({
    mutationFn: async (cartItemId: string) => {
      if (!isAuthenticated) {
        removeItem(cartItemId);
        return;
      }
      await api.delete(`/cart/items/${cartItemId}`);
      await queryClient.invalidateQueries({ queryKey: ['cart', locale] });
    },
  });
}

export async function mergeGuestCartToServer(items: CartItem[]) {
  if (items.length === 0) return;
  await api.post('/cart/sync', {
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      quantity: item.quantity,
    })),
  });
}
