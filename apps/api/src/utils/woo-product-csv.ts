export const WOO_IMPORT_NOTE =
  'Thông số (chất liệu, kích thước, loại…) tạm nằm trong mô tả sản phẩm. Specifications và variants để trống.';

export const WOO_EXTERNAL_SOURCE = 'woocommerce';

export type WooMappedProduct = {
  externalId: string;
  type: 'simple' | 'variable' | 'grouped' | 'external' | 'variation';
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  salePrice: number | null;
  regularPrice: number | null;
  categoryPaths: string[][];
  imageUrls: string[];
};

const TYPE_MAP: Record<string, WooMappedProduct['type']> = {
  simple: 'simple',
  variable: 'variable',
  grouped: 'grouped',
  external: 'external',
  variation: 'variation',
};

export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseImageUrls(raw: string): string[] {
  return raw
    .split(',')
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

export function parseCategoryPaths(raw: string): string[][] {
  return raw
    .split(',')
    .map((path) => path.trim())
    .filter((path) => path && path.toLowerCase() !== 'chưa phân loại')
    .map((path) => path.split('>').map((part) => part.trim()).filter(Boolean))
    .filter((parts) => parts.length > 0);
}

export function mapWooCsvRow(row: Record<string, string>): WooMappedProduct | null {
  const externalId = (row.ID || row.id || '').trim();
  const name = (row.Tên || row.Name || row.name || '').trim();
  if (!externalId || !name) return null;

  const typeRaw = (row.Loại || row.Type || 'simple').trim().toLowerCase();
  const skuRaw = (row['Mã sản phẩm'] || row.SKU || row.sku || '').trim();
  const slugBase = slugifySafe(name) || `wc-${externalId}`;

  return {
    externalId,
    type: TYPE_MAP[typeRaw] ?? 'simple',
    sku: skuRaw || `WC-${externalId}`,
    slug: slugBase,
    name,
    shortDescription: row['Mô tả ngắn'] || row['Short description'] || '',
    description: row['Mô tả'] || row.Description || '',
    salePrice: parsePrice(row['Giá khuyến mãi'] || row['Sale price'] || ''),
    regularPrice: parsePrice(row['Giá bán thường'] || row['Regular price'] || ''),
    categoryPaths: parseCategoryPaths(row['Danh mục'] || row.Categories || ''),
    imageUrls: parseImageUrls(row['Hình ảnh'] || row.Images || ''),
  };
}

function slugifySafe(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
