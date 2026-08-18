'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
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
import api from '@/lib/api';
import type { PaginatedApiResponse } from '@/lib/api';
import type { ApiCategory } from '@/lib/catalog';
import { productImage, productName } from '@/lib/catalog';
import { formatMoney } from '@/lib/format-money';
import { ctaClassName } from '@/lib/brand';

type AdminProduct = {
  id: string;
  slug: string;
  sku: string;
  basePrice: string | number;
  currency: string;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  images: { url: string; altText?: string | null }[];
  translations: { name?: string }[];
  category: { id: string; slug: string; name: string } | null;
  _count: { variants: number };
};

const EMPTY_FILTERS = {
  search: '',
  categoryId: '',
  isActive: '',
  inStock: '',
  isFeatured: '',
  sort: 'newest',
};

export default function AdminProductsPage() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const categoriesQuery = useQuery({
    queryKey: ['categories-tree'],
    queryFn: () => api.get<{ data: ApiCategory[] }>('/categories').then((r) => r.data.data),
  });

  const flatCategories = useMemo(
    () =>
      (categoriesQuery.data ?? []).flatMap((category) => [
        category,
        ...(category.children ?? []),
      ]),
    [categoriesQuery.data],
  );

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
        key: 'categoryId',
        label: t('columns.category'),
        type: 'select',
        options: [
          { value: '', label: t('filters.allCategories') },
          ...flatCategories.map((category) => ({ value: category.id, label: category.name })),
        ],
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
        key: 'isFeatured',
        label: t('columns.featured'),
        type: 'select',
        options: [
          { value: '', label: t('filters.allFeatured') },
          { value: 'true', label: t('status.featured') },
        ],
      },
      {
        key: 'sort',
        label: common('sort'),
        type: 'select',
        options: [
          { value: 'newest', label: t('filters.sortNewest') },
          { value: 'name_asc', label: t('filters.sortName') },
          { value: 'price_asc', label: t('filters.sortPriceAsc') },
          { value: 'price_desc', label: t('filters.sortPriceDesc') },
        ],
      },
    ],
    [common, flatCategories, t],
  );

  const query = useQuery({
    queryKey: ['admin-products', locale, applied, page],
    queryFn: () => {
      const params: Record<string, string | number> = { locale, page, limit: 20 };
      if (applied.search) params.search = applied.search;
      if (applied.categoryId) params.categoryId = applied.categoryId;
      if (applied.isActive) params.isActive = applied.isActive;
      if (applied.inStock) params.inStock = applied.inStock;
      if (applied.isFeatured) params.isFeatured = applied.isFeatured;
      if (applied.sort) params.sort = applied.sort;
      return api
        .get<PaginatedApiResponse<AdminProduct>>('/products/admin', { params })
        .then((r) => r.data);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/products/${id}/active`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const rows = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;
  const total = query.data?.meta.total ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-[#064E3B]">{t('products')}</h1>
          <p className="mt-1 text-sm text-[#475569]">
            {t('filters.resultsCount', { count: total })}
          </p>
        </div>
        <Link href={`/${locale}/admin/products/new`} className={ctaClassName}>
          {t('createProduct')}
        </Link>
      </div>

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
              <TableHead>{t('columns.product')}</TableHead>
              <TableHead>{t('columns.category')}</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>{t('columns.variants')}</TableHead>
              <TableHead>{t('columns.price')}</TableHead>
              <TableHead>{t('columns.stock')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead className="text-right">{common('edit')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[#475569]">
                  {common('loading')}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[#475569]">
                  {common('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((product) => {
                const image = productImage(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
                          {image ? (
                            <Image
                              src={image.url}
                              alt={image.alt}
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-medium">{productName(product)}</p>
                          <p className="text-xs text-[#475569]">{product.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category?.name ?? '—'}</TableCell>
                    <TableCell>
                      <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-xs">{product.sku}</code>
                    </TableCell>
                    <TableCell>{product._count.variants}</TableCell>
                    <TableCell>{formatMoney(product.basePrice, product.currency, locale)}</TableCell>
                    <TableCell>
                      <span className={product.stockQuantity <= 0 ? 'text-[#DC2626]' : undefined}>
                        {product.stockQuantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={product.isActive ? 'success' : 'muted'}>
                          {product.isActive ? t('status.active') : t('status.inactive')}
                        </Badge>
                        {product.isFeatured ? (
                          <Badge variant="warning">{t('status.featured')}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        className="mr-3 text-sm text-[#059669] hover:underline"
                        onClick={() => toggle.mutate({ id: product.id, isActive: !product.isActive })}
                      >
                        {product.isActive ? t('actions.deactivate') : t('actions.activate')}
                      </button>
                      <Link
                        href={`/${locale}/admin/products/${product.id}`}
                        className="text-sm text-[#059669] hover:underline"
                      >
                        {common('edit')}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
