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
    '/checkout/result': { vi: '/thanh-toan/ket-qua', en: '/checkout/result' },
    '/orders': { vi: '/don-hang', en: '/orders' },
    '/orders/[id]': { vi: '/don-hang/[id]', en: '/orders/[id]' },
    '/wishlist': { vi: '/yeu-thich', en: '/wishlist' },
    '/blog': { vi: '/blog', en: '/blog' },
    '/blog/[slug]': { vi: '/blog/[slug]', en: '/blog/[slug]' },
    '/account': { vi: '/tai-khoan', en: '/account' },
    '/auth/login': { vi: '/dang-nhap', en: '/auth/login' },
    '/auth/staff-login': { vi: '/dang-nhap-nhan-vien', en: '/auth/staff-login' },
    '/auth/register': { vi: '/dang-ky', en: '/auth/register' },
    '/admin/dashboard': { vi: '/admin/dashboard', en: '/admin/dashboard' },
    '/admin/inventory': { vi: '/admin/inventory', en: '/admin/inventory' },
    '/admin/audit-logs': { vi: '/admin/audit-logs', en: '/admin/audit-logs' },
    '/admin/orders': { vi: '/admin/orders', en: '/admin/orders' },
    '/admin/orders/[id]': { vi: '/admin/orders/[id]', en: '/admin/orders/[id]' },
  },
});

export type AppPathnames = keyof typeof routing.pathnames;
