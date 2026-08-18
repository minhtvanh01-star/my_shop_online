'use client';

import { useTranslations } from 'next-intl';

type ListPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function ListPagination({ page, totalPages, onPageChange }: ListPaginationProps) {
  const common = useTranslations('Common');

  if (totalPages <= 1) return null;

  return (
    <nav className="mt-6 flex items-center justify-center gap-2" aria-label={common('pagination')}>
      {page > 1 ? (
        <button
          type="button"
          className="inline-flex h-11 items-center border border-[#E2E8F0] bg-white px-4 text-sm text-[#064E3B] transition-colors hover:border-[#059669]"
          onClick={() => onPageChange(page - 1)}
        >
          {common('previous')}
        </button>
      ) : null}
      <span className="px-3 text-sm text-[#475569]">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <button
          type="button"
          className="inline-flex h-11 items-center border border-[#E2E8F0] bg-white px-4 text-sm text-[#064E3B] transition-colors hover:border-[#059669]"
          onClick={() => onPageChange(page + 1)}
        >
          {common('next')}
        </button>
      ) : null}
    </nav>
  );
}
