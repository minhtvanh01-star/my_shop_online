const COOKIE = 'access-token';
const MAX_AGE_SECONDS = 15 * 60;

export function setAccessTokenCookie(token: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearAccessTokenCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readAccessTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${COOKIE}=`;
  const row = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  if (!row) return null;
  return decodeURIComponent(row.slice(prefix.length)) || null;
}
