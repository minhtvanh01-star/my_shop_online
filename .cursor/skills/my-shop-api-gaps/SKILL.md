---
name: my-shop-api-gaps
description: Remaining My Shop Online API work after modules were mounted. Use when implementing cart sync, coupons, refunds, COD, email, OAuth, payment body parsing, or other backend gaps vs docs/06.
---

# API leftovers

All modules in `apps/api/src/modules/` are **mounted** in `app.ts` (including **coupons**). Prefer `app.ts` over older “unmounted” notes. Completeness: `docs/09-tien-do-va-backlog.md`.

## Already mounted (do not re-implement)

- `POST /cart/sync`, cart stock checks on add/update
- Coupon CRUD + apply on order (`usedCount` after payment)
- COD `POST /payments/cod`
- Stripe refund `POST /payments/:id/refund`
- Stripe webhook raw body **only** on that route, before `express.json()`

## Fix next (correctness)

| Gap | Notes |
|-----|--------|
| Order FX | `exchangeRate` is stored; line `unitPrice` / `totalAmount` still USD catalog numbers |
| VNPay amount | Uses `totalAmount * 100` as VND; broken if order currency is still USD |
| Admin cancel restock | `cancelOrder` restocks; `updateOrderStatus` → `cancelled` does not |
| Stripe refund idempotency | Stripe call is outside the DB transaction |
| Webhook rate limit | Global limiter wraps Stripe webhook / VNPay IPN |
| Coupon `%` cap | `value` has no max 100 |
| Email send | Verify/reset tokens in Redis only |

## Later

- VNPay refund API
- **Google Sign-In (OAuth)** + send verify/reset codes via Gmail — parked 18/08, user asked to defer
- Inventory stock-alert email, shipping CRUD
- Login lockout 5/min, httpOnly refresh cookie
- Permission-matrix RBAC (today: role name checks only)
- Assign `CUSTOMER` `user_roles` row on register

## Conventions

Follow `.claude/rules/api-conventions.md` and `.claude/rules/business-rules.md`. Controllers never import Prisma. Throw `AppError`. Roles are `ADMIN`, `SUPER_ADMIN`, not `'admin'`.
