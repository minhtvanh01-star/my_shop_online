import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Wishlist');
  return { title: t('pageTitle') };
}

export default async function WishlistPage() {
  return (
    <div className="container py-8">
      {/* <WishlistGrid /> */}
    </div>
  );
}
