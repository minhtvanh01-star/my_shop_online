# Staff Login Overrides

> **PROJECT:** My Shop Online
> Rules here **override** `MASTER.md`.

---

## Layout

- Separate from storefront login. No shopping header, cart drawer, or register CTA.
- One composition: brand, heading, current server label, form, link back to the shop.
- Card on muted wash (`#E8F1F3`), not the storefront white chrome.

## Paths (stable for other software)

| Locale | Path |
|--------|------|
| vi | `/vi/dang-nhap-nhan-vien` |
| en | `/en/auth/staff-login` |

Do not put a staff CTA on `/auth/login`. Admin routes redirect here.

## Deep-link query (reserved for later integration)

Other apps can open this URL and land on the correct staff session:

- `email` — prefill username
- `redirect` — internal path after sign-in (e.g. `/vi/admin/dashboard`)
- `server` — instance id; shown as “Máy chủ”. Later this becomes a server picker that routes to that shop’s staff user.

Example: `/vi/dang-nhap-nhan-vien?server=hn-01&email=warehouse@myshop.dev&redirect=/vi/admin/orders`

## Accessibility

- Same as login.md: paste allowed, `autocomplete` on email/password, error summary after failed submit.
- `robots: noindex` — internal portal.
