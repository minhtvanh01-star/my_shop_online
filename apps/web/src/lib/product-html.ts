const SCRIPT_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const STYLE_RE = /<style[\s\S]*?>[\s\S]*?<\/style>/gi;
const EVENT_ATTR_RE = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Strip script/style and inline handlers from imported product HTML. */
export function sanitizeProductHtml(html: string): string {
  return html
    .replace(SCRIPT_RE, '')
    .replace(STYLE_RE, '')
    .replace(EVENT_ATTR_RE, '')
    .replace(/javascript:/gi, '');
}
