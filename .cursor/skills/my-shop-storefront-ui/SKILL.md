---
name: my-shop-storefront-ui
description: Implements My Shop Online storefront and admin UI with the persisted design system, shadcn, and next-intl. Use when building pages, components, layouts, checkout, product grids, or reviewing UI/UX.
---

# Storefront / Admin UI

## Before coding

1. Read `design-system/my-shop-online/MASTER.md`.
2. Read `design-system/my-shop-online/pages/<page>.md` if it exists (overrides Master).
3. Reuse existing routes, i18n keys (`apps/web/messages/vi.json` + `en.json`), Zustand stores, and `lib/api.ts`.

## Stack

- Next.js App Router, `next-intl` pathnames in `apps/web/src/i18n/routing.ts`
- shadcn/ui + Tailwind + **Lucide** icons (already in the repo)
- React Hook Form + Zod, TanStack Query, Zustand

## Must

- Roboto (latin + latin-ext + vietnamese). Do not keep Inter.
- Storefront page background white. CTA `#EA580C` with black label.
- Hero: brand + one headline + one sentence + CTA + full-bleed product image. No hero cards or overlay chips.
- Checkout: 4 named steps + error summary after failed submit + inline `aria-describedby`.
- Login: allow paste, `autocomplete` on password fields.
- Admin lists: shadcn `Table` / DataTable, not CSS-grid “tables”.
- Respect `prefers-reduced-motion`. Visible focus. No emoji icons.

## Do not

- Invent new API shapes — call existing `/api/v1` modules.
- Mount a second design system or swap to Phosphor.
- Build the admin dashboard before storefront checkout works.
