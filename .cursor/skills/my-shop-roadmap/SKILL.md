---
name: my-shop-roadmap
description: Tracks My Shop Online completion and the next implementation slice. Use when continuing work, checking progress, planning the next feature, or asking what to build next.
---

# My Shop Online — continue here

Read `docs/09-tien-do-va-backlog.md` before implementing.

## Current phase

**Storefront UI.** API modules are mounted. Pages are empty stubs. The shop cannot sell yet.

## Build order (do not skip)

1. Auth pages (`/auth/login`, `/auth/register`) + cookie `access-token` aligned with middleware
2. Storefront chrome: `Header`, `Footer`, `CartDrawer`
3. Home → product list → product detail (add to cart)
4. Cart → 4-step checkout (docs/04)
5. Stripe Elements + VNPay redirect UI
6. Account, orders, wishlist
7. Admin shell + products + orders
8. API leftovers: `POST /cart/sync`, coupon CRUD, email, refund, COD

## Rules

- One slice per session. Do not start admin UI before a guest can browse and a customer can check out.
- UI: skill `my-shop-storefront-ui` + `design-system/my-shop-online/`.
- API gaps: skill `my-shop-api-gaps`.
- Specs: `docs/01`–`docs/08`. Business rules: `.claude/rules/business-rules.md`.
