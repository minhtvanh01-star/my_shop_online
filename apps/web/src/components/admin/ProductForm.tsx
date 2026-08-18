'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api, { getApiError } from '@/lib/api';
import type { ApiCategory } from '@/lib/catalog';
import { ctaClassName } from '@/lib/brand';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';
import { skuFromSlug, slugify } from '@/lib/slug';
import { uploadProductImage } from '@/lib/upload-media';

type ImageRow = { url: string; altText: string; isPrimary: boolean };
type SpecRow = { name: string; value: string; unit: string };
type VariantRow = {
  sku: string;
  optionName: string;
  optionValue: string;
  priceModifier: string;
  stockQuantity: string;
};

export type ProductFormInitial = {
  slug: string;
  sku: string;
  type: string;
  categoryId: string;
  categoryIds: string[];
  currency: string;
  basePrice: string;
  compareAt: string;
  stockQuantity: string;
  isFeatured: boolean;
  isActive: boolean;
  nameVi: string;
  nameEn: string;
  shortVi: string;
  shortEn: string;
  descVi: string;
  descEn: string;
  images: ImageRow[];
  specs: SpecRow[];
  variants: VariantRow[];
};

const EMPTY: ProductFormInitial = {
  slug: '',
  sku: '',
  type: 'simple',
  categoryId: '',
  categoryIds: [],
  currency: 'USD',
  basePrice: '',
  compareAt: '',
  stockQuantity: '0',
  isFeatured: false,
  isActive: false,
  nameVi: '',
  nameEn: '',
  shortVi: '',
  shortEn: '',
  descVi: '',
  descEn: '',
  images: [],
  specs: [{ name: '', value: '', unit: '' }],
  variants: [],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
      <h2 className="font-heading text-lg text-[#064E3B]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ProductForm({
  mode,
  productId,
  initial,
  existingVariants = [],
}: {
  mode: 'create' | 'edit';
  productId?: string;
  initial?: ProductFormInitial;
  existingVariants?: VariantRow[];
}) {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState<ProductFormInitial>(initial ?? EMPTY);
  const shop = useShopSettings();
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [skuTouched, setSkuTouched] = useState(mode === 'edit');
  const [errors, setErrors] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  useEffect(() => {
    if (initial || mode !== 'create') return;
    setForm((prev) =>
      prev.currency === EMPTY.currency ? { ...prev, currency: shop.catalogCurrency } : prev,
    );
  }, [initial, mode, shop.catalogCurrency]);

  const categoriesQuery = useQuery({
    queryKey: ['categories-tree'],
    queryFn: () => api.get<{ data: ApiCategory[] }>('/categories').then((r) => r.data.data),
  });

  const flatCategories = useMemo(
    () =>
      (categoriesQuery.data ?? []).flatMap((category) => [
        category,
        ...(category.children ?? []),
      ]),
    [categoriesQuery.data],
  );

  const setField = <K extends keyof ProductFormInitial>(key: K, value: ProductFormInitial[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onNameViChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, nameVi: value };
      if (!slugTouched) next.slug = slugify(value);
      if (!skuTouched && next.slug) next.sku = skuFromSlug(next.slug);
      return next;
    });
  };

  const addImages = (rows: ImageRow[]) => {
    setForm((prev) => {
      const images = [...prev.images, ...rows];
      if (!images.some((image) => image.isPrimary) && images[0]) {
        images[0] = { ...images[0], isPrimary: true };
      }
      return { ...prev, images };
    });
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setErrors([]);
    try {
      const uploaded: ImageRow[] = [];
      for (const file of Array.from(files)) {
        const media = await uploadProductImage(file);
        uploaded.push({ url: media.url, altText: file.name, isPrimary: false });
      }
      addImages(uploaded);
    } catch (err) {
      setErrors([getApiError(err)]);
    } finally {
      setUploading(false);
    }
  };

  const addImageFromUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      setErrors([t('form.invalidImageUrl')]);
      return;
    }
    addImages([{ url, altText: form.nameVi || url, isPrimary: false }]);
    setImageUrl('');
  };

  const validate = (): string[] => {
    const next: string[] = [];
    if (!form.nameVi.trim()) next.push(t('form.nameRequired'));
    if (!form.slug.trim()) next.push(t('form.slugRequired'));
    if (!form.sku.trim()) next.push(t('form.skuRequired'));
    if (!form.categoryId) next.push(t('form.categoryRequired'));
    const price = Number(form.basePrice);
    if (!Number.isFinite(price) || price <= 0) next.push(t('form.priceRequired'));
    if (form.isActive && form.images.length === 0) next.push(t('form.imageRequiredToPublish'));
    return next;
  };

  const buildPayload = () => {
    const price = Number(form.basePrice);
    const compareAt = form.compareAt.trim() ? Number(form.compareAt) : undefined;
    const nameEn = form.nameEn.trim() || form.nameVi.trim();
    const extraIds = form.categoryIds.filter((id) => id && id !== form.categoryId);
    return {
      categoryId: form.categoryId,
      categoryIds: [form.categoryId, ...extraIds],
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      type: form.type,
      basePrice: price,
      currency: form.currency,
      ...(mode === 'create' ? { stockQuantity: Number(form.stockQuantity) || 0 } : {}),
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      translations: [
        {
          locale: 'vi',
          name: form.nameVi.trim(),
          shortDescription: form.shortVi || undefined,
          description: form.descVi || undefined,
        },
        {
          locale: 'en',
          name: nameEn,
          shortDescription: form.shortEn || undefined,
          description: form.descEn || undefined,
        },
      ],
      images: form.images.map((image, index) => ({
        url: image.url,
        altText: image.altText || undefined,
        sortOrder: index,
        isPrimary: image.isPrimary,
      })),
      prices: [
        {
          currency: form.currency,
          amount: price,
          compareAt: compareAt && Number.isFinite(compareAt) ? compareAt : undefined,
        },
      ],
      specifications: form.specs
        .filter((row) => row.name.trim() && row.value.trim())
        .map((row, index) => ({
          locale: locale === 'en' ? 'en' : 'vi',
          name: row.name.trim(),
          value: row.value.trim(),
          unit: row.unit.trim() || undefined,
          sortOrder: index,
        })),
      variants: form.variants
        .filter((row) => row.sku.trim() && row.optionName.trim() && row.optionValue.trim())
        .map((row) => ({
          sku: row.sku.trim(),
          optionName: row.optionName.trim(),
          optionValue: row.optionValue.trim(),
          priceModifier: Number(row.priceModifier) || 0,
          stockQuantity: Number(row.stockQuantity) || 0,
        })),
    };
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      const payload = buildPayload();
      if (mode === 'create') {
        const created = await api.post<{ data: { id: string } }>('/products', payload);
        router.push(`/${locale}/admin/products/${created.data.data.id}`);
        return;
      }
      if (productId) {
        const { variants, ...rest } = payload;
        await api.put(`/products/${productId}`, rest);
        for (const variant of variants) {
          await api.post(`/products/${productId}/variants`, variant);
        }
        router.push(`/${locale}/admin/products/${productId}`);
      }
    } catch (err) {
      setErrors([getApiError(err)]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/${locale}/admin/products`} className="text-sm text-[#059669] hover:underline">
            ← {common('back')}
          </Link>
          <h1 className="mt-2 font-heading text-2xl text-[#064E3B]">
            {mode === 'create' ? t('createProduct') : t('editProduct')}
          </h1>
        </div>
        <button type="submit" className={ctaClassName} disabled={saving || uploading}>
          {saving ? common('loading') : common('save')}
        </button>
      </div>

      {errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
        >
          <p className="font-medium">{t('form.errorTitle')}</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Section title={t('sections.general')}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="nameVi">{t('form.nameVi')}</Label>
            <Input id="nameVi" value={form.nameVi} onChange={(e) => onNameViChange(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nameEn">{t('form.nameEn')}</Label>
            <Input id="nameEn" value={form.nameEn} onChange={(e) => setField('nameEn', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setField('slug', e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => {
                setSkuTouched(true);
                setField('sku', e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="type">{t('labels.productType')}</Label>
            <Select id="type" value={form.type} onChange={(e) => setField('type', e.target.value)}>
              <option value="simple">{t('productType.simple')}</option>
              <option value="variable">{t('productType.variable')}</option>
              <option value="grouped">{t('productType.grouped')}</option>
              <option value="external">{t('productType.external')}</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="categoryId">{t('form.primaryCategory')}</Label>
            <Select
              id="categoryId"
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              required
            >
              <option value="">{t('form.selectCategory')}</option>
              {flatCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {flatCategories.length > 1 ? (
          <fieldset>
            <legend className="text-sm font-medium text-[#064E3B]">{t('form.extraCategories')}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {flatCategories
                .filter((category) => category.id !== form.categoryId)
                .map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm text-[#064E3B]">
                    <input
                      type="checkbox"
                      className="size-4 accent-[#059669]"
                      checked={form.categoryIds.includes(category.id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setField(
                          'categoryIds',
                          checked
                            ? [...form.categoryIds, category.id]
                            : form.categoryIds.filter((id) => id !== category.id),
                        );
                      }}
                    />
                    {category.name}
                  </label>
                ))}
            </div>
          </fieldset>
        ) : null}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-[#064E3B]">
            <input
              type="checkbox"
              className="size-4 accent-[#059669]"
              checked={form.isFeatured}
              onChange={(e) => setField('isFeatured', e.target.checked)}
            />
            {t('status.featured')}
          </label>
          <label className="flex items-center gap-2 text-sm text-[#064E3B]">
            <input
              type="checkbox"
              className="size-4 accent-[#059669]"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
            />
            {t('form.publishNow')}
          </label>
        </div>
      </Section>

      <Section title={t('sections.pricing')}>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="currency">{t('form.currency')}</Label>
            <Select id="currency" value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
              {(shop.features.multiCurrency
                ? ['VND', 'USD']
                : [...new Set([shop.catalogCurrency, form.currency])]
              ).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="basePrice">{t('form.salePrice')}</Label>
            <Input
              id="basePrice"
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={(e) => setField('basePrice', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="compareAt">{t('form.regularPrice')}</Label>
            <Input
              id="compareAt"
              type="number"
              min="0"
              step="0.01"
              value={form.compareAt}
              onChange={(e) => setField('compareAt', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stockQuantity">{t('columns.stock')}</Label>
            {mode === 'edit' ? (
              <p className="text-sm text-[#475569]">
                {t('stock.catalogHint')}{' '}
                <Link href={`/${locale}/admin/inventory`} className="text-[#059669] underline-offset-2 hover:underline">
                  {t('inventory')}
                </Link>
              </p>
            ) : (
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(e) => setField('stockQuantity', e.target.value)}
              />
            )}
          </div>
        </div>
      </Section>

      <Section title={t('sections.translations')}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="shortVi">{t('form.shortVi')}</Label>
            <Textarea id="shortVi" value={form.shortVi} onChange={(e) => setField('shortVi', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="shortEn">{t('form.shortEn')}</Label>
            <Textarea id="shortEn" value={form.shortEn} onChange={(e) => setField('shortEn', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descVi">{t('form.descVi')}</Label>
            <Textarea id="descVi" className="min-h-40" value={form.descVi} onChange={(e) => setField('descVi', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descEn">{t('form.descEn')}</Label>
            <Textarea id="descEn" className="min-h-40" value={form.descEn} onChange={(e) => setField('descEn', e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title={t('sections.images')}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#064E3B] hover:border-[#059669]">
            <Upload className="size-4" aria-hidden />
            {uploading ? t('form.uploading') : t('form.uploadImages')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => {
                void uploadFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="imageUrl">{t('form.imageUrl')}</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              placeholder="https://"
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-lg border border-[#E2E8F0] px-4 text-sm text-[#064E3B] hover:border-[#059669]"
            onClick={addImageFromUrl}
          >
            {t('form.addUrl')}
          </button>
        </div>
        {form.images.length === 0 ? (
          <p className="text-sm text-[#475569]">{t('form.noImages')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {form.images.map((image, index) => (
              <li key={`${image.url}-${index}`} className="rounded-lg border border-[#E2E8F0] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.altText} className="h-28 w-full rounded-md object-cover" />
                <label className="mt-2 flex items-center gap-2 text-xs text-[#064E3B]">
                  <input
                    type="radio"
                    name="primary-image"
                    checked={image.isPrimary}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        images: prev.images.map((row, rowIndex) => ({
                          ...row,
                          isPrimary: rowIndex === index,
                        })),
                      }))
                    }
                  />
                  {t('form.primaryImage')}
                </label>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-[#DC2626]"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      images: prev.images.filter((_, rowIndex) => rowIndex !== index),
                    }))
                  }
                >
                  <Trash2 className="size-3" aria-hidden />
                  {common('delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('sections.specifications')}>
        {form.specs.map((row, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_8rem_auto]">
            <Input
              placeholder={t('columns.specName')}
              value={row.name}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  specs: prev.specs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, name: e.target.value } : item,
                  ),
                }))
              }
            />
            <Input
              placeholder={t('columns.specValue')}
              value={row.value}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  specs: prev.specs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, value: e.target.value } : item,
                  ),
                }))
              }
            />
            <Input
              placeholder={t('form.unit')}
              value={row.unit}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  specs: prev.specs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, unit: e.target.value } : item,
                  ),
                }))
              }
            />
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center text-[#DC2626]"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  specs: prev.specs.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
              aria-label={common('delete')}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-[#059669]"
          onClick={() => setForm((prev) => ({ ...prev, specs: [...prev.specs, { name: '', value: '', unit: '' }] }))}
        >
          <Plus className="size-4" aria-hidden />
          {t('form.addSpec')}
        </button>
      </Section>

      <Section title={t('sections.variants')}>
        {mode === 'edit' && existingVariants.length > 0 ? (
          <ul className="space-y-1 text-sm text-[#475569]">
            {existingVariants.map((row) => (
              <li key={row.sku}>
                <code>{row.sku}</code> — {row.optionName}: {row.optionValue}
              </li>
            ))}
          </ul>
        ) : null}
        {form.variants.map((row, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-5">
            <Input
              placeholder="SKU"
              value={row.sku}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  variants: prev.variants.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, sku: e.target.value } : item,
                  ),
                }))
              }
            />
            <Input
              placeholder={t('form.optionName')}
              value={row.optionName}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  variants: prev.variants.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, optionName: e.target.value } : item,
                  ),
                }))
              }
            />
            <Input
              placeholder={t('form.optionValue')}
              value={row.optionValue}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  variants: prev.variants.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, optionValue: e.target.value } : item,
                  ),
                }))
              }
            />
            <Input
              placeholder={t('columns.priceModifier')}
              type="number"
              value={row.priceModifier}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  variants: prev.variants.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, priceModifier: e.target.value } : item,
                  ),
                }))
              }
            />
            <div className="flex gap-2">
              <Input
                placeholder={t('columns.stock')}
                type="number"
                value={row.stockQuantity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    variants: prev.variants.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, stockQuantity: e.target.value } : item,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="text-[#DC2626]"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    variants: prev.variants.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                aria-label={common('delete')}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-[#059669]"
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              variants: [
                ...prev.variants,
                { sku: '', optionName: '', optionValue: '', priceModifier: '0', stockQuantity: '0' },
              ],
            }))
          }
        >
          <Plus className="size-4" aria-hidden />
          {t('form.addVariant')}
        </button>
      </Section>

      <div className="flex justify-end">
        <button type="submit" className={ctaClassName} disabled={saving || uploading}>
          {saving ? common('loading') : common('save')}
        </button>
      </div>
    </form>
  );
}
