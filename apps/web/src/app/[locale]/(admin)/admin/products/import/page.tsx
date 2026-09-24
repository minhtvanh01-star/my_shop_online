'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import api, { getApiError } from '@/lib/api';
import { ctaClassName } from '@/lib/brand';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  note: string;
  skippedRows: { externalId: string; name: string; reason: string }[];
};

export default function AdminProductImportPage() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [currency, setCurrency] = useState('VND');
  const [publish, setPublish] = useState(false);
  const [defaultStock, setDefaultStock] = useState('0');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importCsv = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t('import.needFile'));
      const csv = await file.text();
      return api
        .post<{ data: ImportResult }>('/products/import', {
          csv,
          currency,
          publish,
          defaultStock: Number(defaultStock) || 0,
          updateExisting,
        }, { timeout: 120_000 })
        .then((r) => r.data.data);
    },
    onSuccess: (data) => {
      setError(null);
      setResult(data);
    },
    onError: (err) => {
      setResult(null);
      setError(getApiError(err));
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/${locale}/admin/products`} className="text-sm text-[#059669] hover:underline">
          ← {common('back')}
        </Link>
        <h1 className="mt-2 font-heading text-2xl text-[#064E3B]">{t('import.title')}</h1>
        <p className="mt-2 text-sm text-[#475569]">{t('import.lead')}</p>
      </div>

      <form
        className="space-y-4 rounded-lg border border-[#E2E8F0] bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          importCsv.mutate();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="csv-file">{t('import.file')}</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="currency">{t('import.currency')}</Label>
            <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="stock">{t('import.defaultStock')}</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={defaultStock}
              onChange={(e) => setDefaultStock(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#064E3B]">
          <input
            type="checkbox"
            className="size-4 accent-[#059669]"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
          {t('import.publish')}
        </label>
        <label className="flex items-center gap-2 text-sm text-[#064E3B]">
          <input
            type="checkbox"
            className="size-4 accent-[#059669]"
            checked={updateExisting}
            onChange={(e) => setUpdateExisting(e.target.checked)}
          />
          {t('import.updateExisting')}
        </label>
        <button type="submit" className={ctaClassName} disabled={importCsv.isPending}>
          {importCsv.isPending ? common('loading') : t('import.submit')}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-[#DC2626]">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm text-[#475569]">
          <p className="font-medium text-[#064E3B]">
            {t('import.success', {
              created: result.created,
              updated: result.updated,
              skipped: result.skipped,
            })}
          </p>
          <p className="mt-2">
            {t('import.note')}: {result.note}
          </p>
          {result.skippedRows.length > 0 ? (
            <ul className="mt-3 list-disc pl-5">
              <li className="font-medium text-[#064E3B]">{t('import.skipped')}</li>
              {result.skippedRows.slice(0, 20).map((row) => (
                <li key={`${row.externalId}-${row.reason}`}>
                  {row.externalId || '—'} {row.name} ({row.reason})
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
