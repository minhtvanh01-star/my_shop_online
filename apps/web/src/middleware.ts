import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const STOREFRONT_PROTECTED_PREFIXES = [
  '/account',
  '/tai-khoan',
  '/orders',
  '/don-hang',
  '/checkout',
  '/thanh-toan',
  '/wishlist',
  '/yeu-thich',
];

const ADMIN_PREFIX = '/admin';

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

function localeFromPath(pathname: string): string {
  return (
    routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
    ?? routing.defaultLocale
  );
}

function localizedPath(locale: string, pathnameKey: '/auth/login' | '/auth/staff-login'): string {
  const mapped = routing.pathnames[pathnameKey];
  const slug = typeof mapped === 'string' ? mapped : mapped[locale as 'vi' | 'en'];
  return `/${locale}${slug}`;
}

function isStorefrontProtected(pathnameWithoutLocale: string): boolean {
  return STOREFRONT_PROTECTED_PREFIXES.some(
    (prefix) => pathnameWithoutLocale === prefix || pathnameWithoutLocale.startsWith(`${prefix}/`),
  );
}

function isAdminProtected(pathnameWithoutLocale: string): boolean {
  return pathnameWithoutLocale === ADMIN_PREFIX || pathnameWithoutLocale.startsWith(`${ADMIN_PREFIX}/`);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameWithoutLocale = stripLocale(pathname);
  const token = request.cookies.get('access-token')?.value;

  if (!token) {
    const locale = localeFromPath(pathname);

    if (isAdminProtected(pathnameWithoutLocale)) {
      const url = new URL(localizedPath(locale, '/auth/staff-login'), request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (isStorefrontProtected(pathnameWithoutLocale)) {
      const url = new URL(localizedPath(locale, '/auth/login'), request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)'],
};
