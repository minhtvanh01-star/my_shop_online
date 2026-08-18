'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EXCHANGE_RATE_KEY, parseExchangeRate, settingsMap } from '@/lib/currency';

type PublicSetting = { key: string; value: string | null };

const ShopSettingsContext = createContext({ usdToVnd: 25000 });

export function ShopSettingsProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get<{ data: PublicSetting[] }>('/settings').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const usdToVnd = useMemo(() => {
    const map = settingsMap(query.data ?? []);
    return parseExchangeRate(map[EXCHANGE_RATE_KEY]);
  }, [query.data]);

  return (
    <ShopSettingsContext.Provider value={{ usdToVnd }}>{children}</ShopSettingsContext.Provider>
  );
}

export function useShopSettings() {
  return useContext(ShopSettingsContext);
}
