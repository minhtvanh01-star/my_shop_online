'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api, { getApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ctaClassName } from '@/lib/brand';
import {
  parseShopSettings,
  settingValue,
  SHOP_SETTING_KEYS,
  type ShopSettings,
} from '@/lib/shop-settings';

type SettingRow = {
  key: string;
  value: string | null;
  description: string | null;
  group: string | null;
};

type FeatureRow = {
  key: string;
  isEnabled: boolean;
  description: string | null;
};

const EDITABLE_KEYS = [
  SHOP_SETTING_KEYS.siteName,
  SHOP_SETTING_KEYS.catalogCurrency,
  SHOP_SETTING_KEYS.exchangeUsdToVnd,
  SHOP_SETTING_KEYS.localeViCurrency,
  SHOP_SETTING_KEYS.localeEnCurrency,
  SHOP_SETTING_KEYS.dashboardCurrency,
  SHOP_SETTING_KEYS.shippingFlatFeeUsd,
  SHOP_SETTING_KEYS.shippingFreeThresholdUsd,
  SHOP_SETTING_KEYS.stripeEnabled,
  SHOP_SETTING_KEYS.vnpayEnabled,
  SHOP_SETTING_KEYS.codEnabled,
  SHOP_SETTING_KEYS.stripeLocales,
  SHOP_SETTING_KEYS.vnpayLocales,
  SHOP_SETTING_KEYS.codLocales,
  SHOP_SETTING_KEYS.returnWindowDays,
  SHOP_SETTING_KEYS.orderMaxItems,
  SHOP_SETTING_KEYS.defaultCountry,
  SHOP_SETTING_KEYS.allowedCountries,
  SHOP_SETTING_KEYS.accessTokenTtlS,
  SHOP_SETTING_KEYS.refreshTokenTtlD,
  SHOP_SETTING_KEYS.rateLimitMax,
  SHOP_SETTING_KEYS.rateLimitWindowMin,
  SHOP_SETTING_KEYS.mediaMaxFileSizeMb,
] as const;

const BOOLEAN_KEYS = new Set<string>([
  SHOP_SETTING_KEYS.stripeEnabled,
  SHOP_SETTING_KEYS.vnpayEnabled,
  SHOP_SETTING_KEYS.codEnabled,
]);

const CURRENCY_KEYS = new Set<string>([
  SHOP_SETTING_KEYS.catalogCurrency,
  SHOP_SETTING_KEYS.localeViCurrency,
  SHOP_SETTING_KEYS.localeEnCurrency,
  SHOP_SETTING_KEYS.dashboardCurrency,
]);

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border border-[#E2E8F0] p-4">
      <div>
        <h2 className="font-heading text-lg text-[#064E3B]">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-[#475569]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminSettingsPanel() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<{ data: SettingRow[] }>('/settings/admin').then((r) => r.data.data),
  });
  const flagsQuery = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => api.get<{ data: FeatureRow[] }>('/settings/features').then((r) => r.data.data),
  });

  const parsed: ShopSettings = useMemo(
    () => parseShopSettings(settingsQuery.data ?? [], flagsQuery.data ?? []),
    [settingsQuery.data, flagsQuery.data],
  );

  useEffect(() => {
    if (!settingsQuery.data) return;
    const next: Record<string, string> = {};
    for (const key of EDITABLE_KEYS) {
      const row = settingsQuery.data.find((item) => item.key === key);
      next[key] = row?.value ?? settingValue(parsed, key);
    }
    setDraft(next);
  }, [settingsQuery.data, parsed]);

  const save = useMutation({
    mutationFn: async () => {
      const rows = settingsQuery.data ?? [];
      await Promise.all(
        EDITABLE_KEYS.map(async (key) => {
          const current = rows.find((row) => row.key === key)?.value ?? settingValue(parsed, key);
          const next = draft[key];
          if (next == null || next === current) return;
          await api.put(`/settings/${key}`, { value: next });
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
    },
  });

  const toggleFlag = useMutation({
    mutationFn: ({ key, isEnabled }: { key: string; isEnabled: boolean }) =>
      api.patch(`/settings/features/${key}`, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });

  const setField = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const field = (key: string, label: string, type: 'text' | 'number' = 'text', extra?: { min?: number }) => (
    <div>
      <Label htmlFor={key}>{label}</Label>
      {CURRENCY_KEYS.has(key) ? (
        <Select id={key} value={draft[key] ?? ''} onChange={(e) => setField(key, e.target.value)}>
          <option value="VND">VND</option>
          <option value="USD">USD</option>
        </Select>
      ) : BOOLEAN_KEYS.has(key) ? (
        <label className="mt-2 flex h-11 items-center gap-2 text-sm text-[#064E3B]">
          <input
            id={key}
            type="checkbox"
            className="size-4 accent-[#059669]"
            checked={draft[key] === 'true'}
            onChange={(e) => setField(key, e.target.checked ? 'true' : 'false')}
          />
            {draft[key] === 'true' ? t('config.enabled') : t('config.disabled')}
        </label>
      ) : (
        <Input
          id={key}
          type={type}
          min={extra?.min}
          value={draft[key] ?? ''}
          onChange={(e) => setField(key, e.target.value)}
        />
      )}
    </div>
  );

  const flags = flagsQuery.data ?? [];
  const flagLabels: Record<string, string> = {
    'feature.review_system': t('config.flagReviews'),
    'feature.wishlist': t('config.flagWishlist'),
    'feature.blog': t('config.flagBlog'),
    'feature.coupon': t('config.flagCoupon'),
    'feature.multi_currency': t('config.flagMultiCurrency'),
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('settings')}</h1>
      <p className="text-sm text-[#475569]">{t('config.intro')}</p>

      <Section title={t('config.general')} hint={t('config.generalHint')}>
        <div className="grid gap-4 md:grid-cols-2">
          {field(SHOP_SETTING_KEYS.siteName, t('config.siteName'))}
          {field(SHOP_SETTING_KEYS.exchangeUsdToVnd, t('config.exchangeRate'), 'number', { min: 1 })}
          {field(SHOP_SETTING_KEYS.catalogCurrency, t('config.catalogCurrency'))}
          {field(SHOP_SETTING_KEYS.dashboardCurrency, t('config.dashboardCurrency'))}
          {field(SHOP_SETTING_KEYS.localeViCurrency, t('config.viCurrency'))}
          {field(SHOP_SETTING_KEYS.localeEnCurrency, t('config.enCurrency'))}
        </div>
      </Section>

      <Section title={t('config.shipping')} hint={t('config.shippingHint')}>
        <div className="grid gap-4 md:grid-cols-2">
          {field(SHOP_SETTING_KEYS.shippingFlatFeeUsd, t('config.shippingFlatFee'), 'number', { min: 0 })}
          {field(SHOP_SETTING_KEYS.shippingFreeThresholdUsd, t('config.shippingFreeThreshold'), 'number', { min: 0 })}
        </div>
      </Section>

      <Section title={t('config.payments')} hint={t('config.paymentsHint')}>
        <div className="grid gap-4 md:grid-cols-3">
          {field(SHOP_SETTING_KEYS.stripeEnabled, t('config.stripeEnabled'))}
          {field(SHOP_SETTING_KEYS.vnpayEnabled, t('config.vnpayEnabled'))}
          {field(SHOP_SETTING_KEYS.codEnabled, t('config.codEnabled'))}
          {field(SHOP_SETTING_KEYS.stripeLocales, t('config.stripeLocales'))}
          {field(SHOP_SETTING_KEYS.vnpayLocales, t('config.vnpayLocales'))}
          {field(SHOP_SETTING_KEYS.codLocales, t('config.codLocales'))}
        </div>
      </Section>

      <Section title={t('config.orders')} hint={t('config.ordersHint')}>
        <div className="grid gap-4 md:grid-cols-2">
          {field(SHOP_SETTING_KEYS.returnWindowDays, t('config.returnWindowDays'), 'number', { min: 1 })}
          {field(SHOP_SETTING_KEYS.orderMaxItems, t('config.orderMaxItems'), 'number', { min: 1 })}
          {field(SHOP_SETTING_KEYS.defaultCountry, t('config.defaultCountry'))}
          {field(SHOP_SETTING_KEYS.allowedCountries, t('config.allowedCountries'))}
        </div>
      </Section>

      <Section title={t('config.ops')} hint={t('config.opsHint')}>
        <div className="grid gap-4 md:grid-cols-2">
          {field(SHOP_SETTING_KEYS.accessTokenTtlS, t('config.accessTokenTtlS'), 'number', { min: 60 })}
          {field(SHOP_SETTING_KEYS.refreshTokenTtlD, t('config.refreshTokenTtlD'), 'number', { min: 1 })}
          {field(SHOP_SETTING_KEYS.rateLimitMax, t('config.rateLimitMax'), 'number', { min: 1 })}
          {field(SHOP_SETTING_KEYS.rateLimitWindowMin, t('config.rateLimitWindowMin'), 'number', { min: 1 })}
          {field(SHOP_SETTING_KEYS.mediaMaxFileSizeMb, t('config.mediaMaxFileSizeMb'), 'number', { min: 1 })}
        </div>
      </Section>

      <button type="button" className={ctaClassName} disabled={save.isPending} onClick={() => save.mutate()}>
        {common('save')}
      </button>
      {save.isError ? <p className="text-sm text-[#DC2626]">{getApiError(save.error)}</p> : null}
      {save.isSuccess ? <p className="text-sm text-[#059669]">{t('config.saved')}</p> : null}

      <Section title={t('config.features')} hint={t('config.featuresHint')}>
        <ul className="space-y-3">
          {flags.map((flag) => (
            <li key={flag.key}>
              <label className="flex items-center gap-2 text-sm text-[#064E3B]">
                <input
                  type="checkbox"
                  className="size-4 accent-[#059669]"
                  checked={flag.isEnabled}
                  disabled={toggleFlag.isPending}
                  onChange={(e) => toggleFlag.mutate({ key: flag.key, isEnabled: e.target.checked })}
                />
                <span>{flagLabels[flag.key] ?? flag.key}</span>
              </label>
              {flag.description ? <p className="ml-6 text-xs text-[#475569]">{flag.description}</p> : null}
            </li>
          ))}
        </ul>
        {toggleFlag.isError ? <p className="text-sm text-[#DC2626]">{getApiError(toggleFlag.error)}</p> : null}
      </Section>
    </div>
  );
}
