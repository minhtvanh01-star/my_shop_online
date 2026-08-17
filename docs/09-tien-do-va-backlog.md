# Tài liệu 09 — Tiến độ và backlog

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Tiến độ hoàn thiện + backlog chức năng |
| **Phiên bản** | 1.0.0 |
| **Ngày** | 2026-08-17 |
| **Nguồn** | Rà soát codebase + UI-UX Pro Max |

---

## Tóm tắt

Nền tảng (schema + 13 module API đã mount) gần xong. **Cửa hàng chưa bán được:** mọi trang `apps/web` vẫn là stub, chưa có Header/Footer, chưa có trang đăng nhập dù middleware đã redirect tới `/dang-nhap`.

| Tầng | Hoàn thiện (ước lượng) |
|------|------------------------|
| Tài liệu `docs/01`–`08` | 100% |
| Prisma schema | 90% |
| API đã mount | 72% |
| Storefront UI | 8% |
| Admin UI | 6% |
| Design tokens áp vào web | 0% (đã persist, chưa gắn) |
| Email / cron / OAuth | 8% |
| **Có thể bán hàng** | **~12%** |

---

## API — đã có (mounted trong `app.ts`)

auth, users, products, categories, cart, orders, payments, reviews, wishlist, blog, pages, media, admin, settings.

## API — còn thiếu so với docs

| Chức năng | Trạng thái |
|-----------|------------|
| `POST /cart/sync` (guest merge) | Frontend đã gọi, **API chưa có** |
| Coupon CRUD (admin) | Chỉ apply lúc tạo đơn |
| COD | Chưa |
| Refund Stripe / VNPay | Chưa |
| Email verify / reset / order mail | TODO trong auth |
| OAuth | Chỉ có model |
| Inventory admin + stock alert | Schema có, chưa API |
| Shipping method CRUD | Schema có, chưa API |
| Product duplicate / import CSV / FTS | Chưa |
| Webhook Stripe tách khỏi JSON parser | Cả router `/payments` đang mount trước `express.json()` |

## Frontend — trang đã khai báo, UI trống

Storefront: home, products, PDP, cart, checkout, wishlist, blog, account, orders.

Admin: dashboard, products, orders, customers, blog, media, settings.

**Thiếu file:** `auth/login`, `auth/register` (pathnames đã có trong `routing.ts`).

**Chrome thiếu:** Header, Footer, CartDrawer, AdminSidebar, AdminTopbar. shadcn mới có `Button`.

## Thứ tự làm tiếp

1. Trang đăng nhập / đăng ký + cookie `access-token`
2. Header, Footer, CartDrawer
3. Home → listing → PDP
4. Cart → checkout 4 bước
5. Stripe Elements + VNPay
6. Account / orders / wishlist
7. Admin shell + sản phẩm + đơn
8. API leftovers (cart sync, coupon, email, refund, COD)

Design system: `design-system/my-shop-online/`. Skills: `.cursor/skills/my-shop-*`.
