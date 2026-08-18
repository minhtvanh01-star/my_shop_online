import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.R2_HOSTNAME ?? 'assets.example.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
      },
    ],
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:path*', destination: `${apiBase}/:path*` }]
      : [];
  },
};

export default withNextIntl(nextConfig);
