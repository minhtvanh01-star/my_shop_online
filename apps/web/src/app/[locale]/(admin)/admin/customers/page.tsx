'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
import api from '@/lib/api';
import type { PaginatedApiResponse } from '@/lib/api';

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
};

const EMPTY_FILTERS = { search: '', isActive: '' };

export default function AdminCustomersPage() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: 'search',
        label: common('search'),
        type: 'search',
        placeholder: t('filters.searchCustomerPlaceholder'),
        className: 'min-w-[14rem] flex-[2] space-y-1',
      },
      {
        key: 'isActive',
        label: t('columns.status'),
        type: 'select',
        options: [
          { value: '', label: t('filters.allStatuses') },
          { value: 'true', label: t('status.active') },
          { value: 'false', label: t('status.inactive') },
        ],
      },
    ],
    [common, t],
  );

  const query = useQuery({
    queryKey: ['admin-users', applied, page],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (applied.search) params.search = applied.search;
      if (applied.isActive) params.isActive = applied.isActive;
      return api.get<PaginatedApiResponse<AdminUser>>('/admin/users', { params }).then((r) => r.data);
    },
  });

  const rows = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;
  const total = query.data?.meta.total ?? 0;

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('customers')}</h1>
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

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.customerName')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.phone')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-[#475569]">
                  {common('loading')}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-[#475569]">
                  {common('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'muted'}>
                      {user.isActive ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
