'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  parseShopSettings,
  SHOP_SETTINGS_DEFAULTS,
  type ShopSettings,
} from '@/lib/shop-settings';

type PublicSetting = { key: string; value: string | null };
type FeatureFlag = { key: string; isEnabled: boolean };

const ShopSettingsContext = createContext<ShopSettings>(SHOP_SETTINGS_DEFAULTS);

export function ShopSettingsProvider({ children }: { children: React.ReactNode }) {
  const settingsQuery = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get<{ data: PublicSetting[] }>('/settings').then((r) => r.data.data),
    staleTime: 60_000,
  });
  const flagsQuery = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => api.get<{ data: FeatureFlag[] }>('/settings/features').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const value = useMemo(
    () => parseShopSettings(settingsQuery.data ?? [], flagsQuery.data ?? []),
    [settingsQuery.data, flagsQuery.data],
  );

  return <ShopSettingsContext.Provider value={value}>{children}</ShopSettingsContext.Provider>;
}

export function useShopSettings() {
  return useContext(ShopSettingsContext);
}
