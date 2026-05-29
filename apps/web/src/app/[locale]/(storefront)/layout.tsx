// Storefront layout — wraps all customer-facing pages
// Add Header, Footer, CartDrawer here once those components exist.
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* <Header /> */}
      <main className="flex-1">{children}</main>
      {/* <Footer /> */}
      {/* <CartDrawer /> */}
    </div>
  );
}
