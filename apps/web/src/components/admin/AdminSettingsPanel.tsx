'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api, { getApiError } from '@/lib/api';
import { EXCHANGE_RATE_KEY } from '@/lib/currency';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ctaClassName } from '@/lib/brand';

type SettingRow = {
  key: string;
  value: string | null;
  description: string | null;
  group: string | null;
};

export function AdminSettingsPanel() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<{ data: SettingRow[] }>('/settings/admin').then((r) => r.data.data),
  });

  const exchange = query.data?.find((row) => row.key === EXCHANGE_RATE_KEY);
  const save = useMutation({
    mutationFn: (value: string) => api.put(`/settings/${EXCHANGE_RATE_KEY}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
    },
  });

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('settings')}</h1>
      <section className="space-y-3 border border-[#E2E8F0] p-4">
        <h2 className="font-heading text-lg">{t('exchangeRate')}</h2>
        <p className="text-sm text-[#475569]">{exchange?.description ?? t('exchangeRateHint')}</p>
        <div>
          <Label htmlFor="usdToVnd">1 USD = ? VND</Label>
          <Input
            id="usdToVnd"
            type="number"
            min={1}
            step={1}
            defaultValue={exchange?.value ?? '25000'}
            key={exchange?.value ?? 'default'}
          />
        </div>
        <button
          type="button"
          className={ctaClassName}
          disabled={save.isPending}
          onClick={() => {
            const input = document.getElementById('usdToVnd') as HTMLInputElement | null;
            if (input?.value) save.mutate(input.value);
          }}
        >
          {common('save')}
        </button>
        {save.isError ? <p className="text-sm text-[#DC2626]">{getApiError(save.error)}</p> : null}
        {save.isSuccess ? <p className="text-sm text-[#059669]">{common('save')}</p> : null}
      </section>
    </div>
  );
}
