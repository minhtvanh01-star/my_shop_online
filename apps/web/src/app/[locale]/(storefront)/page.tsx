import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('Home');
  return (
    <div>
      {/* Hero section */}
      {/* Featured products */}
      {/* Categories grid */}
      {/* Blog posts preview */}
      <h1 className="sr-only">{t('title')}</h1>
    </div>
  );
}
