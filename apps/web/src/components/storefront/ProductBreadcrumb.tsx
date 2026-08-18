import { Link } from '@/i18n/navigation';

export function ProductBreadcrumb({
  category,
  productName,
  homeLabel,
  productsLabel,
}: {
  category: { slug: string; name: string } | null;
  productName: string;
  homeLabel: string;
  productsLabel: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#475569]">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-[#059669] hover:underline">
            {homeLabel}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/products" className="hover:text-[#059669] hover:underline">
            {productsLabel}
          </Link>
        </li>
        {category ? (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={{ pathname: '/categories/[slug]', params: { slug: category.slug } }}
                className="hover:text-[#059669] hover:underline"
              >
                {category.name}
              </Link>
            </li>
          </>
        ) : null}
        <li aria-hidden="true">/</li>
        <li className="text-[#064E3B]" aria-current="page">
          {productName}
        </li>
      </ol>
    </nav>
  );
}
