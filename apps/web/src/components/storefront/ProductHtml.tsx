import { looksLikeHtml, sanitizeProductHtml } from '@/lib/product-html';

export function ProductHtml({ html, className }: { html: string; className?: string }) {
  if (!html.trim()) return null;
  if (!looksLikeHtml(html)) {
    return <div className={className}>{html}</div>;
  }
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(html) }}
    />
  );
}
