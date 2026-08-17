import { getTranslations } from 'next-intl/server';

export default async function AdminSettingsPage() {
  const t = await getTranslations('Admin');
  return <h1 className="font-heading text-2xl text-[#064E3B]">{t('settings')}</h1>;
}
