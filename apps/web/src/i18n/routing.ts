import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/products': { vi: '/san-pham', en: '/products' },
    '/products/[slug]': { vi: '/san-pham/[slug]', en: '/products/[slug]' },
    '/categories/[slug]': { vi: '/danh-muc/[slug]', en: '/categories/[slug]' },
    '/cart': { vi: '/gio-hang', en: '/cart' },
    '/checkout': { vi: '/thanh-toan', en: '/checkout' },
    '/orders': { vi: '/don-hang', en: '/orders' },
    '/orders/[id]': { vi: '/don-hang/[id]', en: '/orders/[id]' },
    '/wishlist': { vi: '/yeu-thich', en: '/wishlist' },
    '/blog': { vi: '/blog', en: '/blog' },
    '/blog/[slug]': { vi: '/blog/[slug]', en: '/blog/[slug]' },
    '/account': { vi: '/tai-khoan', en: '/account' },
    '/auth/login': { vi: '/dang-nhap', en: '/auth/login' },
    '/auth/register': { vi: '/dang-ky', en: '/auth/register' },
  },
});

export type AppPathnames = keyof typeof routing.pathnames;
