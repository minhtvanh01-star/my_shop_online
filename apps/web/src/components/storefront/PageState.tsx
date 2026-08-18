'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ctaClassName } from '@/lib/brand';

export function LoadingBlock({ label }: { label?: string }) {
  const t = useTranslations('Common');
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-[#475569]" role="status">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      <span>{label ?? t('loading')}</span>
    </div>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12">
      <p className="text-[#064E3B]">{title}</p>
      {description ? <p className="mt-1 text-sm text-[#475569]">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useTranslations('Common');
  return (
    <div className="py-12" role="alert">
      <p className="text-sm text-[#DC2626]">{message ?? t('error')}</p>
      {onRetry ? (
        <button type="button" className={`${ctaClassName} mt-4`} onClick={onRetry}>
          {t('retry')}
        </button>
      ) : null}
    </div>
  );
}
