'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import type { PaginatedApiResponse } from '@/lib/api';

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
};

export default function AdminCustomersPage() {
  const t = useTranslations('Admin');
  const query = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<PaginatedApiResponse<AdminUser>>('/admin/users').then((r) => r.data),
  });
  const rows = query.data?.data ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('customers')}</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0]">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user.id} className="border-b border-[#E2E8F0]">
              <td className="py-2">{user.fullName}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
