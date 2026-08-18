import { getTranslations } from 'next-intl/server';
import { brand } from '@/lib/brand';
import { FooterNav } from '@/components/storefront/FooterNav';

export async function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#E2E8F0] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-heading text-lg font-semibold text-[#064E3B]">{brand.name}</p>
          <p className="mt-2 max-w-sm text-sm text-[#475569]">{year}</p>
        </div>
        <FooterNav />
      </div>
    </footer>
  );
}
