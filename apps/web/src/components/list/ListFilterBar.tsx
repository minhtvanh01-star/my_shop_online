'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ctaClassName } from '@/lib/brand';

export type FilterFieldConfig = {
  key: string;
  label: string;
    type: 'search' | 'select' | 'date';
  placeholder?: string;
  options?: { value: string; label: string }[];
  className?: string;
};

type ListFilterBarProps = {
  fields: FilterFieldConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  isLoading?: boolean;
};

export function ListFilterBar({
  fields,
  values,
  onChange,
  onApply,
  onClear,
  isLoading,
}: ListFilterBarProps) {
  const common = useTranslations('Common');
  const admin = useTranslations('Admin');

  const hasActiveFilters = Object.values(values).some((value) => value.trim() !== '');

  return (
    <form
      className="rounded-lg border border-[#E2E8F0] bg-[#E8F1F3]/30 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        {fields.map((field) => (
          <div key={field.key} className={field.className ?? 'min-w-[12rem] flex-1 space-y-1'}>
            <Label htmlFor={`filter-${field.key}`}>{field.label}</Label>
            {field.type === 'search' ? (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#475569]"
                  aria-hidden
                />
                <Input
                  id={`filter-${field.key}`}
                  value={values[field.key] ?? ''}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="pl-9"
                />
              </div>
            ) : field.type === 'date' ? (
              <Input
                id={`filter-${field.key}`}
                type="date"
                value={values[field.key] ?? ''}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            ) : (
              <Select
                id={`filter-${field.key}`}
                value={values[field.key] ?? ''}
                onChange={(event) => onChange(field.key, event.target.value)}
              >
                {field.options?.map((option) => (
                  <option key={option.value || '__all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </div>
        ))}

        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="submit" className={ctaClassName} disabled={isLoading}>
            {common('filter')}
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#064E3B] transition-colors hover:border-[#059669]"
              onClick={onClear}
              disabled={isLoading}
            >
              <X className="size-4" aria-hidden />
              {admin('filters.clear')}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
