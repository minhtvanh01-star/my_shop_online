---
name: my-shop-roadmap
description: Tracks My Shop Online completion and the next implementation slice. Use when continuing work, checking progress, planning the next feature, or asking what to build next.
---

# My Shop Online — continue here

Read `docs/09-tien-do-va-backlog.md` before implementing. That file is the completeness source of truth.

## Current phase

**Storefront is wired; selling blockers are fixed.** Warehouse inventory exists. Customer orders include detail, cancel, and 7-day return/exchange requests. Next: customer forgot/reset password, then admin customer lock.

## Build order

Done: auth pages + cookie, Header/Footer/CartDrawer, catalog, 4-step checkout UI, Stripe/VNPay/COD UI, account/orders/wishlist, admin shell + lists.

Next (do not skip):

1. ~~Selling blockers in `docs/09` (VNPay `ok=`, order FX, admin cancel restock)~~
2. ~~Admin menu by role + inventory~~
3. ~~Customer order detail + return/exchange (7 days)~~
4. Customer forgot/reset password; review after delivery
4. Admin customer lock/unlock if API exists or add a thin endpoint
5. Session/cart-merge/webhook limiter leftovers
6. Email send, **Google OAuth + mã xác minh qua Gmail** — later (parked 18/08; do not start now)
7. Multi-server staff login — deferred

## Rules

- One slice per session.
- UI: skill `my-shop-storefront-ui` + `design-system/my-shop-online/`.
- API gaps: skill `my-shop-api-gaps`.
- Specs: `docs/01`–`docs/08`. Luồng Customer/Staff/Admin: `docs/11`. Business rules: `.claude/rules/business-rules.md`.
