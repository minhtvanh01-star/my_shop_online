import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Auth');
  return {
    title: t('staffLoginTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: { server?: string; email?: string };
}) {
  const t = await getTranslations('Auth');
  const brand = await getTranslations('Metadata');
  const host = headers().get('host') ?? '';
  const workspace = searchParams.server?.trim() || host;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8F1F3] px-4 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
        <p className="font-heading text-sm font-semibold tracking-wide text-[#059669]">{brand('title')}</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-[#064E3B]">{t('staffLoginTitle')}</h1>
        <p className="mt-2 text-[#475569]">{t('staffLoginLead')}</p>
        {workspace ? (
          <p className="mt-3 text-sm text-[#475569]">
            {t('staffWorkspaceLabel')}: <span className="font-medium text-[#064E3B]">{workspace}</span>
          </p>
        ) : null}
        <Suspense fallback={<p className="mt-8 text-sm text-[#475569]">…</p>}>
          <LoginForm mode="staff" />
        </Suspense>
      </div>
    </div>
  );
}
