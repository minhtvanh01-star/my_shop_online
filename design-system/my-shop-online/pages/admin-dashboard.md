# Admin Dashboard Overrides

> **PROJECT:** My Shop Online
> **Page Type:** Ops dashboard
> Rules here **override** `MASTER.md`.

---

## Layout

- Full-width workspace. Density 8 (8–32px spacing). Sidebar + main.
- No marketing hero. First screen: KPIs + recent orders + one trend chart.
- Charts: bullet/KPI vs target for 3–10 metrics; line for revenue over time. Color is not the only status signal — print the number and target as text.
- Tables: shadcn `Table` + TanStack Table for sort/filter/pagination. Never fake tables with CSS grid.

## Color

- Background: white / sidebar muted. Green primary for nav active. Orange only for destructive-urgency (failed payment, low stock).
- Skip mint page wash and large radius marketing cards.

## Motion

- Subtle only (150–200ms). No grid stagger, no `back.out` on tables.

## Components

- `AdminSidebar` + `AdminTopbar` in admin layout.
- Recent orders: semantic table with status text + tone, not color-only pills.
