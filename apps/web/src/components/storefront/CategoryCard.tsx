import { Link } from '@/i18n/navigation';
import type { ApiCategory } from '@/lib/catalog';

export function CategoryCard({ category }: { category: ApiCategory }) {
  return (
    <Link
      href={{ pathname: '/categories/[slug]', params: { slug: category.slug } }}
      className="group block overflow-hidden border border-[#E2E8F0] bg-white transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none"
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#E8F1F3]">
        {category.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-heading text-2xl text-[#059669]/40">
            {category.name.slice(0, 1)}
          </div>
        )}
      </div>
      <p className="px-4 py-3 font-heading text-sm font-medium text-[#064E3B] group-hover:text-[#059669]">
        {category.name}
      </p>
    </Link>
  );
}
