import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Paths that require authentication (after locale prefix stripped)
const AUTH_REQUIRED = ['/account', '/orders', '/checkout', '/wishlist'];
const ADMIN_REQUIRED = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix to inspect the path
  const pathnameWithoutLocale = routing.locales.reduce(
    (acc: string, locale) => acc.replace(new RegExp(`^/${locale}(/|$)`), '/'),
    pathname,
  );

  const isAdminPath = ADMIN_REQUIRED.some((p) => pathnameWithoutLocale.startsWith(p));
  const isAuthPath = AUTH_REQUIRED.some((p) => pathnameWithoutLocale.startsWith(p));

  if (isAdminPath || isAuthPath) {
    // Read the access token from cookie (set by auth store hydration)
    // Full auth validation happens server-side in layouts/pages
    const token = request.cookies.get('access-token')?.value;
    if (!token) {
      const locale = routing.locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
        ?? routing.defaultLocale;

      const loginUrl = new URL(`/${locale}/dang-nhap`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Skip Next.js internals, static files and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)'],
};
