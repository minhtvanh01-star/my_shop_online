import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/format-money';
import { productImage, productName, type CatalogProduct } from '@/lib/catalog';

export function ProductCard({ product, locale }: { product: CatalogProduct; locale: string }) {
  const image = productImage(product);
  const name = productName(product);

  return (
    <Link href={{ pathname: '/products/[slug]', params: { slug: product.slug } }} className="group block">
      <div className="aspect-square overflow-hidden bg-[#E8F1F3]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt || name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : null}
      </div>
      <p className="mt-3 font-heading text-base text-[#064E3B]">{name}</p>
      <p className="mt-1 text-sm text-[#475569]">{formatMoney(product.basePrice, product.currency, locale)}</p>
    </Link>
  );
}
