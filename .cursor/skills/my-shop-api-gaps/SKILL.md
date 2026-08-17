---
name: my-shop-api-gaps
description: Remaining My Shop Online API work after modules were mounted. Use when implementing cart sync, coupons, refunds, COD, email, OAuth, payment body parsing, or other backend gaps vs docs/06.
---

# API leftovers

All 13 modules in `apps/api/src/modules/` are **mounted** in `app.ts`. Do not treat `CLAUDE.md`’s old “Mounted ❌” table as truth — prefer `app.ts`.

## Implement next (backend)

| Gap | Spec | Notes |
|-----|------|--------|
| `POST /cart/sync` | docs/06 | Frontend `useSyncCart` already calls it. Merge guest cart after login. |
| Cart stock checks | docs/04 | Reject add/update when quantity > stock. |
| Coupon CRUD module | docs/04 | Apply-on-order exists; admin create/list/update does not. Increment `usedCount` **after payment succeeds**, not at order create. |
| COD | docs/04 | Locale `vi` only. |
| Refunds | docs/04 | Stripe refund + VNPay refund; admin + customer request. |
| Email | auth TODOs | Verify + reset password; order lifecycle later. |
| Payment JSON | `app.ts` | Keep **only** Stripe webhook on raw body *before* `express.json()`. Other `/payments` POSTs must parse JSON. |

## Later

- OAuth (schema `OAuthAccount` exists, no routes)
- Inventory admin + stock alerts
- Shipping method CRUD
- Product duplicate / CSV import / scheduled publish / PostgreSQL FTS
- Permission-matrix RBAC (today: role name checks only)

## Conventions

Follow `.claude/rules/api-conventions.md` and `.claude/rules/business-rules.md`. Controllers never import Prisma. Throw `AppError`. Roles are `ADMIN`, `SUPER_ADMIN`, not `'admin'`.
