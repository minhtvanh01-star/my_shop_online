'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
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
import api, { type PaginatedApiResponse } from '@/lib/api';
import { canViewAuditLogs } from '@/lib/roles';
import { useCurrentUser } from '@/stores/authStore';

type AuditRow = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  isSensitive: boolean;
  createdAt: string;
  oldValue: unknown;
  newValue: unknown;
  actor: { id: string; fullName: string } | null;
  actorType: string;
};

const RESOURCE_TYPES = [
  'Product',
  'ProductVariant',
  'Category',
  'Order',
  'OrderReturnRequest',
  'Inventory',
  'StockAlert',
  'Coupon',
  'Payment',
  'Setting',
  'FeatureFlag',
  'BlogPost',
  'BlogCategory',
  'Page',
  'Media',
  'ProductReview',
  'Auth',
] as const;

const ACTIONS = [
  'STAFF_LOGIN',
  'CREATE_PRODUCT',
  'UPDATE_PRODUCT',
  'DELETE_PRODUCT',
  'TOGGLE_PRODUCT_ACTIVE',
  'CREATE_VARIANT',
  'CREATE_CATEGORY',
  'UPDATE_CATEGORY',
  'DELETE_CATEGORY',
  'UPDATE_ORDER_STATUS',
  'CANCEL_ORDER',
  'REVIEW_RETURN_REQUEST',
  'ADJUST_STOCK',
  'UPSERT_STOCK_ALERT',
  'CREATE_COUPON',
  'UPDATE_COUPON',
  'DELETE_COUPON',
  'REFUND_PAYMENT',
  'UPDATE_SETTING',
  'TOGGLE_FEATURE_FLAG',
  'CREATE_BLOG_POST',
  'UPDATE_BLOG_POST',
  'DELETE_BLOG_POST',
  'CREATE_BLOG_CATEGORY',
  'CREATE_PAGE',
  'UPDATE_PAGE',
  'DELETE_PAGE',
  'UPLOAD_MEDIA',
  'UPLOAD_MEDIA_BULK',
  'DELETE_MEDIA',
  'MODERATE_REVIEW',
] as const;

const EMPTY_FILTERS = { action: '', resourceType: '', from: '', to: '' };

function formatJson(value: unknown): string {
  if (value == null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '—';
  }
}

export function AuditLogsPanel() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const errorsT = useTranslations('Errors');
  const locale = useLocale();
  const user = useCurrentUser();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const allowed = canViewAuditLogs(user?.role);

  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: 'action',
        label: t('audit.action'),
        type: 'select',
        options: [
          { value: '', label: t('audit.allActions') },
          ...ACTIONS.map((action) => ({
            value: action,
            label: t(`audit.actions.${action}` as 'audit.actions.STAFF_LOGIN'),
          })),
        ],
      },
      {
        key: 'resourceType',
        label: t('audit.resource'),
        type: 'select',
        options: [
          { value: '', label: t('audit.allResources') },
          ...RESOURCE_TYPES.map((resource) => ({
            value: resource,
            label: t(`audit.resources.${resource}` as 'audit.resources.Product'),
          })),
        ],
      },
      { key: 'from', label: t('audit.from'), type: 'date' },
      { key: 'to', label: t('audit.to'), type: 'date' },
    ],
    [t],
  );

  const query = useQuery({
    queryKey: ['admin-audit-logs', applied, page],
    enabled: allowed,
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (applied.action) params.action = applied.action;
      if (applied.resourceType) params.resourceType = applied.resourceType;
      if (applied.from) params.from = applied.from;
      if (applied.to) params.to = applied.to;
      return api.get<PaginatedApiResponse<AuditRow>>('/admin/audit-logs', { params }).then((r) => r.data);
    },
  });

  const rows = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;
  const total = query.data?.meta.total ?? 0;

  if (!allowed) {
    return <p className="text-sm text-[#DC2626]">{errorsT('unauthorized')}</p>;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('audit.title')}</h1>
      <p className="mt-1 text-sm text-[#475569]">{t('audit.lead')}</p>
      <p className="mt-1 text-sm text-[#475569]">{t('filters.resultsCount', { count: total })}</p>

      <div className="mt-6">
        <ListFilterBar
          fields={filterFields}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onApply={() => {
            setApplied(filters);
            setPage(1);
            setSelected(null);
          }}
          onClear={() => {
            setFilters(EMPTY_FILTERS);
            setApplied(EMPTY_FILTERS);
            setPage(1);
            setSelected(null);
          }}
          isLoading={query.isFetching}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('audit.when')}</TableHead>
              <TableHead>{t('audit.actor')}</TableHead>
              <TableHead>{t('audit.action')}</TableHead>
              <TableHead>{t('audit.resource')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-[#475569]">
                  {common('loading')}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-[#475569]">
                  {common('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={selected?.id === row.id ? 'bg-[#ECFDF5]' : 'cursor-pointer'}
                  onClick={() => setSelected(row)}
                >
                  <TableCell>{new Date(row.createdAt).toLocaleString(locale)}</TableCell>
                  <TableCell>{row.actor?.fullName ?? row.actorType}</TableCell>
                  <TableCell>
                    {t.has(`audit.actions.${row.action}`)
                      ? t(`audit.actions.${row.action}` as 'audit.actions.STAFF_LOGIN')
                      : row.action}
                  </TableCell>
                  <TableCell>
                    {(t.has(`audit.resources.${row.resourceType}`)
                      ? t(`audit.resources.${row.resourceType}` as 'audit.resources.Product')
                      : row.resourceType)}
                    {row.resourceId ? ` · ${row.resourceId}` : ''}
                  </TableCell>
                  <TableCell>
                    {row.isSensitive ? (
                      <Badge variant="warning">{t('audit.sensitive')}</Badge>
                    ) : (
                      <Badge variant="muted">{row.actorType}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {selected ? (
        <section className="mt-8 space-y-3 rounded-lg border border-[#E2E8F0] p-4">
          <h2 className="font-heading text-lg text-[#064E3B]">{t('audit.detail')}</h2>
          <p className="text-sm text-[#475569]">
            {t('audit.ip')}: {selected.ipAddress || '—'}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <pre className="overflow-x-auto rounded bg-[#F8FAFC] p-3 text-xs text-[#0F172A]">
              {t('audit.oldValue')}
              {'\n'}
              {formatJson(selected.oldValue)}
            </pre>
            <pre className="overflow-x-auto rounded bg-[#F8FAFC] p-3 text-xs text-[#0F172A]">
              {t('audit.newValue')}
              {'\n'}
              {formatJson(selected.newValue)}
            </pre>
          </div>
        </section>
      ) : (
        <p className="mt-8 text-sm text-[#475569]">{t('audit.selectRow')}</p>
      )}
    </div>
  );
}
