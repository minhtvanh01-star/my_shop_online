# Checkout Page Overrides

> **PROJECT:** My Shop Online
> **Page Type:** Checkout
> Rules here **override** `MASTER.md`.

---

## Layout

- Max width ~960px. Two columns on desktop: steps (left) + order summary (right, sticky).
- One column on mobile; summary collapses under a “Tóm tắt đơn” disclosure.
- **Four steps** (docs/04): cart confirm → shipping → payment → place order.
- Show **Step N of 4** plus named steps. Never a single unmarked form.

## Style

- Minimal / quiet. Density 6. No hero, no marketing motion, no `back.out`.
- Background white. Summary panel may use muted `#E8F1F3`.

## Forms (UI-UX Pro Max)

- Labels visible (not placeholder-only).
- Validate on blur; after failed submit: focus a top **error summary** (`role="alert"`) that links to each invalid field; keep inline `aria-describedby` errors.
- Payment: VNPay + COD when locale is `vi`; Stripe first when locale is `en`. No VNPay on `en`.
- Allow paste and password-manager autofill on any auth fields that appear here.
- `autocomplete` on address fields (`name`, `tel`, `address-line1`, `country`).

## Motion

- Step change: 200ms fade. No scroll-snap.
