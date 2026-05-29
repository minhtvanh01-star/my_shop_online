import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Admin layout — add sidebar + topbar once components exist
// Auth check: middleware handles the redirect, but do a server-side
// role check here for defense-in-depth once cookies are implemented.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar /> */}
      <div className="flex flex-1 flex-col">
        {/* <AdminTopbar /> */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
