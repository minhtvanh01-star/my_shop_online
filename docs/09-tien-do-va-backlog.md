# Tài liệu 09 — Tiến độ và backlog

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Tiến độ hoàn thiện + backlog chức năng |
| **Phiên bản** | 1.5.1 |
| **Ngày** | 2026-08-18 |
| **Nguồn** | Rà soát codebase (API `app.ts` + `apps/web`) vs `docs/01`–`08`; luồng user: `docs/11` |

> Bản 1.0.0 (17/08) ghi storefront ~8% vì trang còn stub. **Không còn đúng.** Dùng bảng và backlog dưới đây.
>
> Review **Customer / Staff / Admin** (chức năng + luồng đã đủ chưa): [`docs/11-luong-vai-tro-va-chuc-nang.md`](./11-luong-vai-tro-va-chuc-nang.md). **Manager chưa làm.**

---

## Tóm tắt

Nền tảng API đã mount và cửa hàng có UI bán hàng thật (auth, catalog, giỏ, checkout 4 bước, Stripe/VNPay/COD, tài khoản). **Blocker bán hàng (VNPay `ok=`, FX dòng đơn, admin hủy hoàn kho) đã sửa 18/08.** Chưa sẵn sàng production vì còn email, session cookie, IPN/refund VNPay, cron hết hạn đơn pending.

| Tầng | 17/08 (cũ) | **18/08 (hiện tại)** | Ý nghĩa |
|------|------------|----------------------|---------|
| Tài liệu `docs/01`–`08` | 100% | **100%** | Spec gốc; chưa sửa theo API thực tế ở vài chỗ |
| Prisma schema | 90% | **~92%** | OAuth / inventory alert / shipping còn model, ít API |
| API đã mount | 72% | **~86%** | Thêm coupons, cart/sync, COD, Stripe refund, inventory |
| Storefront UI | 8% | **~70%** | Mọi route bán hàng có UI + gọi API |
| Admin UI | 6% | **~42%** | Shell theo role + list + form SP + màn kho |
| Design tokens trên web | 0% | **~70%** | Pallete shop + Roboto; chưa token CSS đầy đủ |
| Email / cron / OAuth | 8% | **~12%** | Route auth có; **chưa gửi mail**; chưa cron/OAuth |
| **Quản lý kho (admin / WAREHOUSE)** | — | **~62%** | Module inventory + UI kho (không ảnh); alert in-app; chưa email/PO |
| **Có thể bán hàng** | ~12% | **~62%** | Path VN + VNPay + VND đã khớp tiền/kết quả/hoàn kho khi hủy; còn IPN/email/cron |

**Cách đọc “có thể bán hàng”:** khách đăng nhập duyệt → giỏ → thanh toán **mà không sai tiền / sai tồn kho**. Demo USD+Stripe, COD `vi`, và VNPay `ok=` đã đi được. Chưa production vì IPN/refund/email/cron.

---

## Luồng khách hàng — đã chạy được

| Luồng | Trạng thái |
|-------|------------|
| Home → list → PDP → thêm giỏ (guest localStorage hoặc `POST /cart`) | Được |
| Đăng ký / đăng nhập khách (`/vi/dang-nhap`) | Được |
| Đăng nhập nhân viên riêng (`/vi/dang-nhap-nhan-vien`) | Được |
| Checkout 4 bước (giỏ → giao hàng → thanh toán → xác nhận) | Có UI |
| Stripe Elements | Có UI; cần key + webhook |
| COD (locale `vi`) | Có UI + API |
| VNPay redirect | Có UI; trang kết quả đọc `ok=0\|1`; số tiền VND sau FX |
| Đơn hàng list/chi tiết + hủy khi `pending` | Được |
| Wishlist, blog list/chi tiết | Được |
| Tài khoản: sửa tên/SĐT, đổi mật khẩu, sổ địa chỉ (thêm/sửa/mặc định/xóa) | Được |

Khách **chưa đăng nhập không checkout** (middleware bắt `/checkout` → login).

---

## API — đã mount (`apps/api/src/app.ts`)

auth, users, products, categories, cart, orders, payments, reviews, wishlist, blog, pages, media, admin, settings, **coupons**.

Webhook Stripe: `POST /api/v1/payments/stripe/webhook` (raw body) **trước** `express.json()`. Các POST payments khác parse JSON bình thường.

### API — đã có, docs cũ ghi thiếu

| Chức năng | Trạng thái thật |
|-----------|-----------------|
| `POST /cart/sync` | Có (auth) |
| Kiểm tra tồn khi add/update giỏ | Có |
| Coupon CRUD admin | Có module `/coupons` |
| Apply coupon lúc tạo đơn; `usedCount` sau thanh toán | Có |
| COD | Có `POST /payments/cod` |
| Refund Stripe | Có `POST /payments/:id/refund` |
| Tách webhook Stripe khỏi JSON parser | Đúng (chỉ webhook raw) |

### API — còn thiếu / còn sai so với spec

| Chức năng | Trạng thái |
|-----------|------------|
| Đổi USD catalog → VND trên **dòng đơn** | **Có** — locale `vi` → VND, nhân tỷ giá lúc tạo đơn |
| VNPay: số tiền + chữ ký + IPN | Số tiền: VND major × 100 (sau FX). IPN/hash còn rủi ro |
| Refund VNPay | Chưa gọi cổng VNPay |
| Email verify / reset / đơn hàng | Token Redis; **không gửi SMTP** |
| OAuth | Chỉ model |
| Inventory admin + stock alert | Schema có, chưa API |
| Shipping method CRUD | Schema có, chưa API |
| Product duplicate / import CSV / FTS | Một phần catalog import; FTS chưa |
| Khóa login 5 lần/phút, khóa tài khoản | Chưa (chỉ limiter 200/15 phút toàn cục) |
| Gán role `CUSTOMER` khi đăng ký | JWT fallback `'CUSTOMER'`; có thể không có hàng `user_roles` |
| `GET /settings/features` | Public, trả mọi flag |

---

## Frontend — không còn stub hàng loạt

### Storefront (`apps/web`)

| Trang | Mức | Ghi chú |
|-------|-----|---------|
| `/` home | Đủ dùng | Lỗi API bị nuốt → shop trống im lặng |
| Sản phẩm list + PDP | Đủ dùng | Review **chỉ đọc**; chưa form viết |
| Danh mục `[slug]` | Mỏng | Không empty state / phân trang |
| Giỏ + CartDrawer | Đủ dùng | Merge guest sau login có race |
| Checkout 4 bước | Có | Coupon không preview; currency theo locale (`vi`→VND) |
| `/checkout/result` | Đủ dùng | `ok=0\|1` (VNPay), `redirect_status` (Stripe), `method=cod` |
| Login / register | Đủ dùng | Chưa quên mật khẩu |
| Staff login | Đủ dùng | Tách path; chưa chọn server (cố ý để sau) |
| Account | Đủ dùng | Thêm/sửa/đặt mặc định/xóa địa chỉ |
| Orders | Đủ dùng | Chi tiết, hủy pending, đổi/trả 7 ngày, phân trang |
| Wishlist | Đủ dùng | Chưa “thêm vào giỏ” từ wishlist |
| Blog | Đủ dùng | |
| CMS / legal | Chưa | |

Chrome: Header (có ô tìm → `/san-pham?q=`), Footer, CartDrawer có. Header chưa menu danh mục.

### Admin

| Trang | Mức |
|-------|-----|
| Shell + dashboard stats | Mỏng (thiếu loading/error; doanh thu hardcode VND); WAREHOUSE bị đẩy sang kho |
| Products list + tạo/sửa form | Có; sửa SP **không** ghi đè tồn |
| Orders list + đổi status | Có; WAREHOUSE: confirmed→shipped + tracking, **ẩn giá** |
| Inventory | `/admin/inventory`: tồn/SKU, nhập-điều chỉnh-hỏng, ngưỡng, lịch sử; **không ảnh** |
| Audit log | `/admin/audit-logs`: ADMIN xem log không nhạy cảm; SUPER_ADMIN xem tất cả |
| Customers list + lọc | Có; chưa khóa/mở tài khoản |
| Settings tỷ giá USD→VND | Có |
| Blog, media | **Stub** (chỉ tiêu đề) |

---

## Lỗi đã đối chiếu trong code (chưa sửa)

Blocker bán hàng (VNPay `ok=`, FX dòng đơn, admin hủy hoàn kho) **đã sửa 18/08**. Slice kho (inventory API + UI + RBAC WAREHOUSE) **đã làm 18/08**. Ưu tiên tiếp: quên mật khẩu / session.

| Mức | Vấn đề | Chỗ |
|-----|--------|-----|
| Cao | Cookie `access-token` 15 phút; refresh ở localStorage — hết cookie bị đẩy login dù session còn | `auth-cookie.ts`, `middleware.ts` |
| Cao | `setAuth` bật `GET /cart` trước `POST /cart/sync` — giỏ server trống đè giỏ guest | `useAuth.ts`, `useCart.ts` |
| Cao | Không gửi email | `auth.service.ts` |
| Cao | Stripe refund gọi cổng **ngoài** transaction — retry có thể hoàn hai lần | `payments.service.ts` |
| TB | Logout `router.push('/')` làm mất locale `en` | `useAuth.ts` |
| TB | Rate limit toàn cục bọc webhook Stripe / IPN VNPay | `app.ts` |
| TB | Coupon `%` không trần 100 → `totalAmount` âm | `coupons.schema.ts` |
| Thấp | Refresh token trả JSON, lưu JS (spec muốn httpOnly cookie) | auth API + web |

Đơn Stripe/VNPay **pending** giữ kho; không có cron hết hạn.

---

## Quản lý kho — admin & nhân viên WAREHOUSE

Đối chiếu `docs/02` (role WAREHOUSE), `docs/03` (tồn kho / stock alert), BR-I01–I04. **Slice 18/08:** module `inventory` đã mount; nhân viên kho vào `/admin/inventory` (không ảnh, không giá); đơn `confirmed|processing|shipped` với tracking; menu chỉ Kho + Đơn.

Ước lượng: schema ~90% · trừ/hoàn khi bán ~70% · API kho ~75% · UI kho ~70% → **tổng ~62%**.

### Spec WAREHOUSE vs thực tế

| Việc spec yêu cầu | API | UI | Ghi chú |
|-------------------|-----|----|---------|
| Xem tồn theo SKU | `GET /inventory/items` | `/admin/inventory` | Không giá, không ảnh; low-stock chỉ khi đã đặt `StockAlert` |
| Nhập kho / điều chỉnh / hỏng | `POST /inventory/adjust` | Form trên cùng trang | Ghi `inventory_transaction`; không cho số âm |
| Lịch sử giao dịch | `GET /inventory/transactions` | Panel khi chọn dòng | |
| Ngưỡng cảnh báo | `PUT /inventory/alerts` | Ngưỡng do user nhập | Không default cứng |
| Xem đơn cần giao | `GET /orders/admin` (`requireOrderOps`) | List; **ẩn tổng tiền** | WAREHOUSE chỉ `confirmed|processing|shipped` |
| `confirmed` → `processing` → `shipped` + tracking | `PATCH /orders/:id/status` | Ô tracking bắt buộc lúc shipped | WAREHOUSE không hủy/refund |
| Stock alert | Notification `type=stock_alert` sau trừ/điều chỉnh | Badge “sắp hết” trên bảng kho | Chưa gửi email; chưa inbox UI |
| Backorder | — | — | Cart/order vẫn từ chối hết hàng |

`PUT /products/:id` **không** còn ghi `stockQuantity` (BR-I02). Tồn lúc **tạo** SP vẫn set số ban đầu.

### Tồn kho gắn bán hàng

| Sự kiện | Trừ/hoàn kho | `inventory_transaction` |
|---------|--------------|-------------------------|
| Tạo đơn | Có (atomic `stockQuantity >= qty`) | `sale` + `notifyIfLowStock` |
| Khách hủy `pending` | Có | `return` |
| Admin đổi status → `cancelled` | Có (`restockOrderLines`) | `return` |
| Refund Stripe | Có | `return` |
| Điều chỉnh kho | `POST /inventory/adjust` | `purchase` / `adjustment` / `damage` |
| Sửa sản phẩm | **Không** ghi đè tồn | — |
| Giỏ add/update | Chỉ kiểm tra, không trừ | — |
| VNPay/Stripe pending không trả | Giữ kho mãi | Không cron |

### Còn lại (kho)

1. Email stock alert (cần SMTP).
2. Inbox thông báo trong admin.
3. Đơn mua hàng / phiếu nhập nhà cung cấp.
4. Backorder.
5. `inventory_transaction` lúc **tạo** sản phẩm nếu stock > 0.

---

## Thứ tự làm tiếp (đề xuất — chưa làm)

1. ~~**Sửa blocker bán hàng**~~ — xong 18/08: VNPay `ok=`; FX lúc tạo đơn; admin hủy hoàn kho.
2. ~~**Kho / WAREHOUSE**~~ — xong 18/08: `inventory` API + `/admin/inventory` (không ảnh) + RBAC + tracking.
3. **Tài khoản khách:** quên/reset mật khẩu (UI + gửi mail nếu có SMTP); đánh giá sau đơn `delivered`.
4. **Quản lý khách (admin):** khóa/mở `isActive` (cần API mới); xem đơn theo khách.
5. Cookie/session + merge giỏ + limiter webhook + trần coupon + refund Stripe idempotent.
6. Chi tiết đơn, blog/media — sau khi session/email ổn.
7. Chọn server đăng nhập nhân viên / SSO — **để sau** (URL `?server=` đã giữ chỗ).

### Để sau — Google (đã ghi nhận 18/08, **không làm lúc này**)

Người dùng yêu cầu, chủ đích làm sau khi bán hàng/kho ổn:

| Việc | Ý nghĩa | Ghi chú kỹ thuật sẵn có |
|------|---------|-------------------------|
| **Đăng nhập bằng Google** | Nút “Tiếp tục với Google” trên login/register khách | Model `oauth_accounts` đã có; **chưa** route OAuth, chưa nút UI |
| **Mã xác minh qua Google/Gmail** | Gửi mã/link xác thực email, quên mật khẩu, OTP qua hộp thư Google của khách | Token verify/reset đang nằm Redis; **chưa gửi SMTP**. Khi làm: Gmail API hoặc SMTP Google, ghi `email_logs` |

Không đụng Google Authenticator (TOTP) trừ khi yêu cầu lại. Không bắt đầu slice này trước quên-mật-khẩu nội bộ / SMTP generic nếu chưa chọn nhà cung cấp mail.

Design system: `design-system/my-shop-online/`. Skills: `.cursor/skills/my-shop-*`.
