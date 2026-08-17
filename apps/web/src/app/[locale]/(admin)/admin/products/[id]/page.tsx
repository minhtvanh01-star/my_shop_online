'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';

export default function AdminProductEditPage() {
  const t = useTranslations('Admin');
  const params = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['admin-product', params.id],
    queryFn: () =>
      api.get(`/products/admin/${params.id}`).then((r) => r.data.data).catch(() => null),
  });

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('editProduct')}</h1>
      <pre className="mt-6 overflow-auto text-sm text-[#475569]">
        {JSON.stringify(query.data ?? { id: params.id }, null, 2)}
      </pre>
    </div>
  );
}
