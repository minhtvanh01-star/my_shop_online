import { Footer } from '@/components/storefront/Footer';
import { StorefrontChrome } from '@/components/storefront/StorefrontChrome';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontChrome footer={<Footer />}>{children}</StorefrontChrome>;
}
