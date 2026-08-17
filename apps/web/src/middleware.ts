import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PREFIXES = [
  '/account',
  '/tai-khoan',
  '/orders',
  '/don-hang',
  '/checkout',
  '/thanh-toan',
  '/wishlist',
  '/yeu-thich',
  '/admin',
];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

function isProtected(pathnameWithoutLocale: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathnameWithoutLocale === prefix || pathnameWithoutLocale.startsWith(`${prefix}/`),
  );
}

function loginPath(locale: string): string {
  const mapped = routing.pathnames['/auth/login'];
  const slug = typeof mapped === 'string' ? mapped : mapped[locale as 'vi' | 'en'];
  return `/${locale}${slug}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameWithoutLocale = stripLocale(pathname);

  if (isProtected(pathnameWithoutLocale)) {
    const token = request.cookies.get('access-token')?.value;
    if (!token) {
      const locale =
        routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
        ?? routing.defaultLocale;

      const url = new URL(loginPath(locale), request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)'],
};
