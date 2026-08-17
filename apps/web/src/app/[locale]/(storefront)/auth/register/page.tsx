import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/components/auth/RegisterForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Auth');
  return { title: t('registerTitle') };
}

export default async function RegisterPage() {
  const t = await getTranslations('Auth');
  const brand = await getTranslations('Metadata');

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <p className="font-heading text-sm font-semibold tracking-wide text-[#059669]">{brand('title')}</p>
      <h1 className="mt-3 font-heading text-3xl font-semibold text-[#064E3B]">{t('registerTitle')}</h1>
      <p className="mt-2 text-[#475569]">{t('registerLead')}</p>
      <Suspense fallback={<p className="mt-8 text-sm text-[#475569]">…</p>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
