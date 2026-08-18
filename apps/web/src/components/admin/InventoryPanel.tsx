'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListFilterBar, type FilterFieldConfig } from '@/components/list/ListFilterBar';
import { ListPagination } from '@/components/list/ListPagination';
import api, { getApiError, type PaginatedApiResponse } from '@/lib/api';
import { ctaClassName } from '@/lib/brand';
import { canManageInventory } from '@/lib/roles';
import { useCurrentUser } from '@/stores/authStore';

type StockLine = {
  productId: string;
  variantId: string | null;
  sku: string;
  name: string;
  optionLabel: string | null;
  stockQuantity: number;
  threshold: number | null;
  lowStock: boolean;
};

type StockProduct = {
  productId: string;
  sku: string;
  name: string;
  lines: StockLine[];
};

const EMPTY_FILTERS = { search: '', inStock: '', lowStock: '' };

export function InventoryPanel() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const locale = useLocale();
  const errorsT = useTranslations('Errors');
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StockLine | null>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [adjustType, setAdjustType] = useState<'purchase' | 'adjustment' | 'damage'>('purchase');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [threshold, setThreshold] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: 'search',
        label: common('search'),
        type: 'search',
        placeholder: t('filters.searchProductPlaceholder'),
        className: 'min-w-[14rem] flex-[2] space-y-1',
      },
      {
        key: 'inStock',
        label: t('columns.stock'),
        type: 'select',
        options: [
          { value: '', label: t('filters.allStock') },
          { value: 'true', label: t('filters.inStockOnly') },
          { value: 'false', label: t('filters.outOfStockOnly') },
        ],
      },
      {
        key: 'lowStock',
        label: t('stock.alerts'),
        type: 'select',
        options: [
          { value: '', label: t('filters.allStock') },
          { value: 'true', label: t('stock.lowStockOnly') },
        ],
      },
    ],
    [common, t],
  );

  const query = useQuery({
    queryKey: ['inventory-items', applied, page, locale],
    enabled: canManageInventory(user?.role),
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 20, locale };
      if (applied.search) params.search = applied.search;
      if (applied.inStock) params.inStock = applied.inStock;
      if (applied.lowStock) params.lowStock = applied.lowStock;
      return api.get<PaginatedApiResponse<StockProduct>>('/inventory/items', { params }).then((r) => r.data);
    },
  });

  const txQuery = useQuery({
    queryKey: ['inventory-tx', selected?.productId, selected?.variantId],
    enabled: Boolean(selected) && canManageInventory(user?.role),
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: 1,
        limit: 8,
        productId: selected!.productId,
      };
      if (selected?.variantId) params.variantId = selected.variantId;
      return api
        .get<PaginatedApiResponse<{
          id: string;
          type: string;
          quantityChange: number;
          quantityBefore: number;
          quantityAfter: number;
          note: string | null;
          createdAt: string;
          actor: { fullName: string } | null;
        }>>('/inventory/transactions', { params })
        .then((r) => r.data);
    },
  });

  const adjust = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('no-line');
      const qty = Number(quantity);
      return api.post('/inventory/adjust', {
        productId: selected.productId,
        variantId: selected.variantId ?? undefined,
        type: adjustType,
        quantity: qty,
        direction: adjustType === 'adjustment' ? direction : undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      setFormError(null);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-tx'] });
    },
    onError: (err) => setFormError(getApiError(err)),
  });

  const saveAlert = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('no-line');
      return api.put('/inventory/alerts', {
        productId: selected.productId,
        variantId: selected.variantId ?? undefined,
        threshold: Number(threshold),
      });
    },
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
    onError: (err) => setFormError(getApiError(err)),
  });

  const rows = (query.data?.data ?? []).flatMap((product) => product.lines);
  const totalPages = query.data?.meta.totalPages ?? 1;
  const total = query.data?.meta.total ?? 0;

  if (!canManageInventory(user?.role)) {
    return <p className="text-sm text-[#DC2626]">{errorsT('unauthorized')}</p>;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('stock.title')}</h1>
      <p className="mt-1 text-sm text-[#475569]">{t('stock.lead')}</p>
      <p className="mt-1 text-sm text-[#475569]">{t('filters.resultsCount', { count: total })}</p>

      <div className="mt-6">
        <ListFilterBar
          fields={filterFields}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onApply={() => {
            setApplied(filters);
            setPage(1);
          }}
          onClear={() => {
            setFilters(EMPTY_FILTERS);
            setApplied(EMPTY_FILTERS);
            setPage(1);
          }}
          isLoading={query.isFetching}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.product')}</TableHead>
              <TableHead>{t('columns.sku')}</TableHead>
              <TableHead>{t('columns.option')}</TableHead>
              <TableHead>{t('columns.stock')}</TableHead>
              <TableHead>{t('stock.threshold')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[#475569]">
                  {common('loading')}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[#475569]">
                  {common('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((line) => {
                const active =
                  selected?.productId === line.productId && selected?.variantId === line.variantId;
                return (
                  <TableRow
                    key={`${line.productId}:${line.variantId ?? 'base'}`}
                    className={active ? 'bg-[#ECFDF5]' : 'cursor-pointer'}
                    onClick={() => {
                      setSelected(line);
                      setThreshold(line.threshold != null ? String(line.threshold) : '');
                      setFormError(null);
                    }}
                  >
                    <TableCell className="font-medium">{line.name}</TableCell>
                    <TableCell>{line.sku}</TableCell>
                    <TableCell>{line.optionLabel ?? '—'}</TableCell>
                    <TableCell className={line.stockQuantity <= 0 ? 'text-[#DC2626]' : undefined}>
                      {line.stockQuantity}
                    </TableCell>
                    <TableCell>{line.threshold ?? '—'}</TableCell>
                    <TableCell>
                      {line.lowStock ? (
                        <Badge variant="danger">{t('stock.lowStock')}</Badge>
                      ) : (
                        <Badge variant={line.stockQuantity > 0 ? 'success' : 'muted'}>
                          {line.stockQuantity > 0 ? t('filters.inStockOnly') : t('filters.outOfStockOnly')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {selected ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <form
            className="space-y-4 rounded-lg border border-[#E2E8F0] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              adjust.mutate();
            }}
          >
            <h2 className="font-heading text-lg text-[#064E3B]">{t('stock.adjustTitle')}</h2>
            <p className="text-sm text-[#475569]">
              {selected.name} · {selected.sku}
              {selected.optionLabel ? ` · ${selected.optionLabel}` : ''}
            </p>
            {formError ? <p className="text-sm text-[#DC2626]">{formError}</p> : null}
            <div className="space-y-1">
              <Label htmlFor="adjust-type">{t('stock.type')}</Label>
              <Select
                id="adjust-type"
                value={adjustType}
                onChange={(event) => setAdjustType(event.target.value as typeof adjustType)}
              >
                <option value="purchase">{t('stock.types.purchase')}</option>
                <option value="adjustment">{t('stock.types.adjustment')}</option>
                <option value="damage">{t('stock.types.damage')}</option>
              </Select>
            </div>
            {adjustType === 'adjustment' ? (
              <div className="space-y-1">
                <Label htmlFor="adjust-dir">{t('stock.direction')}</Label>
                <Select
                  id="adjust-dir"
                  value={direction}
                  onChange={(event) => setDirection(event.target.value as typeof direction)}
                >
                  <option value="in">{t('stock.directions.in')}</option>
                  <option value="out">{t('stock.directions.out')}</option>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="adjust-qty">{t('stock.quantity')}</Label>
              <Input
                id="adjust-qty"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adjust-note">{t('stock.note')}</Label>
              <Input
                id="adjust-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <button type="submit" className={ctaClassName} disabled={adjust.isPending}>
              {t('stock.apply')}
            </button>
          </form>

          <form
            className="space-y-4 rounded-lg border border-[#E2E8F0] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveAlert.mutate();
            }}
          >
            <h2 className="font-heading text-lg text-[#064E3B]">{t('stock.alertTitle')}</h2>
            <div className="space-y-1">
              <Label htmlFor="alert-threshold">{t('stock.threshold')}</Label>
              <Input
                id="alert-threshold"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                required
              />
            </div>
            <button type="submit" className={ctaClassName} disabled={saveAlert.isPending}>
              {t('stock.saveAlert')}
            </button>

            <div>
              <h3 className="mt-6 font-heading text-base text-[#064E3B]">{t('stock.history')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#475569]">
                {(txQuery.data?.data ?? []).map((row) => (
                  <li key={row.id}>
                    {new Date(row.createdAt).toLocaleString(locale)} · {t(`stock.types.${row.type}` as 'stock.types.purchase')} ·{' '}
                    {row.quantityBefore} → {row.quantityAfter}
                    {row.actor?.fullName ? ` · ${row.actor.fullName}` : ''}
                    {row.note ? ` · ${row.note}` : ''}
                  </li>
                ))}
                {!txQuery.isLoading && (txQuery.data?.data.length ?? 0) === 0 ? (
                  <li>{common('noResults')}</li>
                ) : null}
              </ul>
            </div>
          </form>
        </section>
      ) : (
        <p className="mt-8 text-sm text-[#475569]">{t('stock.selectLine')}</p>
      )}
    </div>
  );
}
