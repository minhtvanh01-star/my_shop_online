import { getTranslations } from 'next-intl/server';

export default async function AdminBlogPage() {
  const t = await getTranslations('Admin');
  return <h1 className="font-heading text-2xl text-[#064E3B]">{t('blog')}</h1>;
}
