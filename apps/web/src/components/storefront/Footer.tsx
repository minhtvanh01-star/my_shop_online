import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { brand } from '@/lib/brand';

export async function Footer() {
  const t = await getTranslations('Nav');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#E2E8F0] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-heading text-lg font-semibold text-[#064E3B]">{brand.name}</p>
          <p className="mt-2 max-w-sm text-sm text-[#475569]">
            {year}
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
          <Link href="/products" className="text-[#475569] hover:text-[#059669]">
            {t('products')}
          </Link>
          <Link href="/blog" className="text-[#475569] hover:text-[#059669]">
            {t('blog')}
          </Link>
          <Link href="/account" className="text-[#475569] hover:text-[#059669]">
            {t('account')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
