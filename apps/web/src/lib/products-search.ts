export function productsSearchUrl(localizedProductsPath: string, q: string): string {
  const term = q.trim();
  return term ? `${localizedProductsPath}?q=${encodeURIComponent(term)}` : localizedProductsPath;
}
