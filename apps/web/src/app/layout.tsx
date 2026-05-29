import { Geist } from "next/font/google";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// Root layout — required by Next.js but html/body live in [locale]/layout.tsx
// This approach lets [locale]/layout.tsx set the correct `lang` attribute.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
