import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountPanel } from '@/components/account/AccountPanel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Account');
  return { title: t('pageTitle') };
}

export default function AccountPage() {
  return <AccountPanel />;
}
