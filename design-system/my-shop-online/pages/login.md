# Login / Register Overrides

> **PROJECT:** My Shop Online
> Rules here **override** `MASTER.md`.

---

## Layout

- One composition: brand name, one heading, one form, one secondary link.
- No hero image collage, no social-proof strip.

## Accessibility (UI-UX Pro Max — critical)

- `autocomplete="username"` / `current-password` (login) and `new-password` (register).
- Never block paste. Never use a cognitive puzzle as the only auth factor.
- Visible labels. Failed submit → error summary + inline field errors.
- Icon-only controls need `aria-label`.

## Auth wiring

- Pages: `apps/web/src/app/[locale]/(storefront)/auth/login/page.tsx` and `auth/register/page.tsx`.
- next-intl pathnames already map `vi: /dang-nhap`, `en: /auth/login`.
- Access token must be available to middleware cookie `access-token`.
- Customer login must not advertise staff access. Staff use `/auth/staff-login` (see `staff-login.md`).
