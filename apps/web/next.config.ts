import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Cloudflare R2 public bucket URL (set R2_PUBLIC_URL in .env)
        protocol: 'https',
        hostname: process.env.R2_HOSTNAME ?? 'assets.example.com',
      },
      {
        // Local dev uploads
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
      },
    ],
  },
  // Proxy API calls to backend during development
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/:path*`,
          },
        ]
      : [];
  },
};

export default withNextIntl(nextConfig);
