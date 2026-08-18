import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { DisplayPrice } from '@/components/storefront/DisplayPrice';
import { productImage, productName, type CatalogProduct } from '@/lib/catalog';

export async function ProductCard({ product, locale }: { product: CatalogProduct; locale: string }) {
  const t = await getTranslations('Products');
  const image = productImage(product);
  const name = productName(product);
  const outOfStock = product.stockQuantity <= 0;
  const featured = product.isFeatured;

  return (
    <Link
      href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden border border-[#E2E8F0] bg-[#E8F1F3] transition-shadow duration-200 group-hover:shadow-md motion-reduce:transition-none">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt || name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : null}
        {featured ? (
          <span className="absolute left-2 top-2 bg-[#EA580C] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
            {t('featuredBadge')}
          </span>
        ) : null}
        {outOfStock ? (
          <span className="absolute inset-x-2 bottom-2 bg-white/95 px-2 py-1 text-center text-xs font-medium text-[#DC2626]">
            {t('outOfStock')}
          </span>
        ) : null}
      </div>
      {product.category ? (
        <p className="mt-3 text-xs uppercase tracking-wide text-[#475569]">{product.category.name}</p>
      ) : null}
      <p className="mt-1 font-heading text-base text-[#064E3B] group-hover:text-[#059669]">{name}</p>
      <p className="mt-1 text-sm font-medium text-[#064E3B]">
        <DisplayPrice usdAmount={product.basePrice} />
      </p>
    </Link>
  );
}
