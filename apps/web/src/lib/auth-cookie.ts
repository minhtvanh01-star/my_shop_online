const COOKIE = 'access-token';
const FALLBACK_MAX_AGE_SECONDS = 15 * 60;

function jwtRemainingSeconds(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof parsed.exp !== 'number') return null;
    return Math.max(1, parsed.exp - Math.floor(Date.now() / 1000));
  } catch {
    return null;
  }
}

export function setAccessTokenCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const maxAge = jwtRemainingSeconds(token) ?? FALLBACK_MAX_AGE_SECONDS;
  document.cookie = `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
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
