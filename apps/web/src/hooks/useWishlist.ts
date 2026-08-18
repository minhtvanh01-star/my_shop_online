'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import api from '@/lib/api';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';
import { useIsAuthenticated } from '@/stores/authStore';

type WishlistRow = { productId: string };

export function useWishlistIds() {
  const locale = useLocale();
  const isAuthenticated = useIsAuthenticated();
  const shop = useShopSettings();

  return useQuery({
    queryKey: ['wishlist', locale],
    queryFn: () =>
      api.get<{ data: WishlistRow[] }>('/wishlist', { params: { locale } }).then((r) => r.data.data),
    enabled: isAuthenticated && shop.features.wishlist,
    staleTime: 60_000,
    select: (rows) => new Set(rows.map((row) => row.productId)),
  });
}

export function useToggleWishlist(productId: string) {
  const locale = useLocale();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inWishlist: boolean) => {
      if (inWishlist) {
        await api.delete(`/wishlist/${productId}`);
      } else {
        await api.post(`/wishlist/${productId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', locale] });
    },
  });
}
