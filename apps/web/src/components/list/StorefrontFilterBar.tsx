import { getTranslations } from 'next-intl/server';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ctaClassName } from '@/lib/brand';
import type { ApiCategory } from '@/lib/catalog';

type StorefrontFilterBarProps = {
  searchParams: Record<string, string | undefined>;
  categories: ApiCategory[];
  sortOptions: { value: string; labelKey: string }[];
  showCategory?: boolean;
  showInStock?: boolean;
  showFeatured?: boolean;
  searchPlaceholder: string;
  sortLabel: string;
  filterTitle: string;
  categoryLabel?: string;
  inStockLabel?: string;
  featuredLabel?: string;
  allCategoriesLabel: string;
  allLabel: string;
  yesLabel: string;
  noLabel: string;
};

export async function StorefrontFilterBar({
  searchParams,
  categories,
  sortOptions,
  showCategory = true,
  showInStock = false,
  showFeatured = false,
  searchPlaceholder,
  sortLabel,
  filterTitle,
  categoryLabel,
  inStockLabel,
  featuredLabel,
  allCategoriesLabel,
  allLabel,
  yesLabel,
  noLabel,
}: StorefrontFilterBarProps) {
  const common = await getTranslations('Common');
  const sort = searchParams.sort ?? 'newest';

  const flatCategories = categories.flatMap((category) => [
    category,
    ...(category.children ?? []),
  ]);

  return (
    <form
      className="mt-6 rounded-lg border border-[#E2E8F0] bg-[#E8F1F3]/30 p-4"
      method="get"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="q">{common('search')}</Label>
          <Input
            id="q"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="sort">{sortLabel}</Label>
          <Select id="sort" name="sort" defaultValue={sort}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelKey}
              </option>
            ))}
          </Select>
        </div>

        {showCategory ? (
          <div className="space-y-1">
            <Label htmlFor="category">{categoryLabel}</Label>
            <Select id="category" name="category" defaultValue={searchParams.category ?? ''}>
              <option value="">{allCategoriesLabel}</option>
              {flatCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {showInStock ? (
          <div className="space-y-1">
            <Label htmlFor="inStock">{inStockLabel}</Label>
            <Select id="inStock" name="inStock" defaultValue={searchParams.inStock ?? ''}>
              <option value="">{allLabel}</option>
              <option value="true">{yesLabel}</option>
              <option value="false">{noLabel}</option>
            </Select>
          </div>
        ) : null}

        {showFeatured ? (
          <div className="space-y-1">
            <Label htmlFor="featured">{featuredLabel}</Label>
            <Select id="featured" name="featured" defaultValue={searchParams.featured ?? ''}>
              <option value="">{allLabel}</option>
              <option value="true">{yesLabel}</option>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-4">
          <button type="submit" className={ctaClassName}>
            {filterTitle}
          </button>
          {(searchParams.q || searchParams.category || searchParams.inStock || searchParams.featured) ? (
            <a
              href="?"
              className="inline-flex h-11 items-center rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#064E3B] transition-colors hover:border-[#059669]"
            >
              {common('clear')}
            </a>
          ) : null}
        </div>
      </div>
    </form>
  );
}
