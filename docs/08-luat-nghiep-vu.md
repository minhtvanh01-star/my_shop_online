# Tài liệu 08 — Luật nghiệp vụ (Business Rules)

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Luật nghiệp vụ hệ thống |
| **Phiên bản** | 1.0.0 |
| **Ngày tạo** | 2026-05-30 |
| **Người tạo** | Anh Minh Phạm Vũ |

---

## Mục lục

1. [Quy tắc về sản phẩm](#1-quy-tắc-về-sản-phẩm)
2. [Quy tắc về tồn kho](#2-quy-tắc-về-tồn-kho)
3. [Quy tắc về đơn hàng](#3-quy-tắc-về-đơn-hàng)
4. [Quy tắc về thanh toán](#4-quy-tắc-về-thanh-toán)
5. [Quy tắc về bảo mật](#5-quy-tắc-về-bảo-mật)
6. [Quy tắc về người dùng](#6-quy-tắc-về-người-dùng)
7. [Quy tắc về nội dung](#7-quy-tắc-về-nội-dung)
8. [Quy tắc về hiệu suất và giới hạn hệ thống](#8-quy-tắc-về-hiệu-suất-và-giới-hạn-hệ-thống)
9. [Câu hỏi thường gặp](#9-câu-hỏi-thường-gặp)

---

## 1. Quy tắc về sản phẩm

### BR-P01: SKU phải unique toàn hệ thống
- **Rule:** Không có 2 sản phẩm hoặc variant nào có cùng SKU, kể cả sản phẩm đã xóa mềm.
- **Enforcement:** Database constraint `UNIQUE` trên cột `sku`.
- **Lý do:** SKU là mã nhận diện vật lý trong kho — trùng SKU gây nhầm lẫn khi nhập xuất kho.

### BR-P02: Sản phẩm phải có ít nhất 1 ảnh trước khi đăng bán
- **Rule:** Không thể chuyển `isActive = true` nếu bảng `product_images` không có bản ghi nào cho sản phẩm đó.
- **Enforcement:** Validate tại tầng service trước khi cập nhật.
- **Lỗi trả về:** `400 Sản phẩm cần có ít nhất 1 ảnh trước khi đăng bán.`

### BR-P03: Giá không được âm hoặc bằng 0
- **Rule:** `basePrice > 0`, `amount > 0` trong `product_prices`, `unitPrice > 0` trong `order_items`.
- **Enforcement:** Zod schema validation + database check constraint.
- **Lý do:** Giá = 0 gây lỗi thanh toán; giá âm gây lỗi tính toán.

### BR-P04: Slug phải unique và bất biến sau khi index
- **Rule:** Slug tự động tạo từ tên, không trùng với bất kỳ sản phẩm nào khác (kể cả đã xóa mềm). Sau khi sản phẩm có traffic SEO, không nên thay đổi slug.
- **Enforcement:** Validate unique + warning khi admin cố thay đổi slug sản phẩm đã active.
- **Xử lý trùng:** Tự động thêm hậu tố số `-1`, `-2`, ... nếu slug trùng.

### BR-P05: Mỗi sản phẩm chỉ có 1 ảnh đại diện
- **Rule:** `isPrimary = true` chỉ được có trên 1 bản ghi trong `product_images` cho cùng `productId`.
- **Enforcement:** Khi set ảnh mới là primary, tự động unset tất cả ảnh primary cũ.

### BR-P06: Sản phẩm bị xóa mềm không được hiển thị
- **Rule:** Mọi query lấy sản phẩm (public và admin) phải filter `deletedAt IS NULL`.
- **Enforcement:** Prisma middleware hoặc điều kiện where mặc định.

### BR-P07: Chỉ sản phẩm Active mới hiển thị trên storefront
- **Rule:** Storefront chỉ query sản phẩm có `isActive = true` và `deletedAt IS NULL`.
- **Admin:** Có thể xem tất cả trạng thái.

---

## 2. Quy tắc về tồn kho

### BR-I01: Tồn kho không được âm (trừ backorder)
- **Rule:** `stockQuantity ≥ 0` tại mọi thời điểm, ngoại trừ khi `attributes.backorder = true`.
- **Enforcement:** Validate trong service trước khi cập nhật; database check nếu cần.
- **Lỗi:** `400 Không đủ tồn kho.`

### BR-I02: Mọi thay đổi tồn kho phải ghi `inventory_transaction`
- **Rule:** Không cập nhật `stockQuantity` trực tiếp mà không có bản ghi `inventory_transaction` tương ứng.
- **Các loại transaction:** `purchase`, `sale`, `return`, `adjustment`, `damage`.
- **Bắt buộc ghi:** `quantityBefore`, `quantityAfter`, `actorId`, `type`.

### BR-I03: Bản ghi `inventory_transaction` là bất biến
- **Rule:** Không UPDATE hay DELETE bản ghi đã ghi. Để sửa lỗi, ghi thêm giao dịch đối nghịch (`adjustment`).
- **Enforcement:** Không expose endpoint UPDATE/DELETE cho bảng này.

### BR-I04: Khi `stockQuantity ≤ threshold` → cảnh báo
- **Rule:** Sau mỗi lần trừ tồn kho, kiểm tra `StockAlert`. Nếu tồn kho ≤ ngưỡng:
  1. Tạo `Notification` type `stock_alert` cho ADMIN/WAREHOUSE
  2. Gửi email cảnh báo
  3. Cập nhật `lastAlertedAt = now()`
- **Chống spam:** Không gửi lại cảnh báo trong vòng 24 giờ kể từ `lastAlertedAt`.

### BR-I05: Trừ tồn kho ngay khi tạo đơn hàng
- **Rule:** Tồn kho bị trừ ngay tại thời điểm `POST /orders` — không chờ thanh toán thành công.
- **Lý do:** Tránh overselling (2 khách mua cùng lúc item tồn kho = 1).
- **Rollback:** Nếu thanh toán thất bại sau 30 phút, cộng lại tồn kho tự động.

### BR-I06: Tồn kho tổng = tổng variants khi có variants
- **Rule:** Khi sản phẩm có variants, `products.stockQuantity` phải bằng tổng `stockQuantity` của tất cả variants active.
- **Sync:** Tự động cập nhật `products.stockQuantity` sau mỗi thay đổi variant.

---

## 3. Quy tắc về đơn hàng

### BR-O01: Mã đơn hàng — format bắt buộc
- **Rule:** `orderNumber = ORD-{YYYYMMDD}-{XXXXX}` — XXXXX là số thứ tự trong ngày, bắt đầu từ 00001.
- **Ví dụ:** `ORD-20260530-00001`, `ORD-20260530-00042`
- **Enforcement:** Logic sinh mã trong service, không để database tự generate.

### BR-O02: Giá đơn hàng là snapshot — bất biến
- **Rule:** `order_items.unitPrice`, `order_items.productSnapshot` được chụp tại thời điểm tạo đơn. Không bao giờ thay đổi dù admin sửa giá sản phẩm sau.
- **Lý do:** Đảm bảo tính pháp lý và trung thực với khách hàng.

### BR-O03: Chỉ hủy đơn khi status = `pending`
- **Rule:** Khách chỉ hủy được khi `status = pending`. Admin cũng không nên hủy đơn đang giao trừ trường hợp đặc biệt.
- **Enforcement:** Validate status trước khi cho phép cancel.
- **Khi hủy:** Cộng lại tồn kho, hoàn tiền (nếu đã thanh toán).

### BR-O04: Hoàn tiền chỉ Admin thực hiện
- **Rule:** Chỉ ADMIN và SUPER_ADMIN được gọi API refund. CSKH chỉ tạo "yêu cầu hoàn tiền" để Admin phê duyệt.
- **Ghi audit log:** Bắt buộc, ghi lý do hoàn tiền.

### BR-O05: Địa chỉ giao hàng là snapshot
- **Rule:** `orders.shippingAddress` lưu JSON, không dùng FK đến `user_addresses`. Đảm bảo dù user sau này sửa/xóa địa chỉ, đơn hàng vẫn đúng.

### BR-O06: Đơn hàng từ user bị xóa không xóa theo
- **Rule:** Khi user bị soft delete, các đơn hàng liên quan giữ nguyên. Field `userId` trên `orders` dùng `SetNull` thay vì `Cascade`.
- **Lý do:** Dữ liệu tài chính/kế toán phải được lưu trữ.

### BR-O07: Thời hạn hoàn trả — 7 ngày
- **Rule:** Khách chỉ được yêu cầu hoàn trả trong vòng 7 ngày kể từ ngày `deliveredAt`.
- **Enforcement:** Validate ngày trong service khi tạo yêu cầu.

---

## 4. Quy tắc về thanh toán

### BR-PAY01: Dùng Decimal(12,4) cho tất cả tiền tệ
- **Rule:** Không bao giờ dùng `float` hoặc `double` cho tiền tệ. Phải dùng `Decimal(12,4)`.
- **Lý do:** Float gây lỗi làm tròn (0.1 + 0.2 ≠ 0.3 trong float). Decimal chính xác tuyệt đối.
- **Enforcement:** Prisma `@db.Decimal(12,4)` + TypeScript `Decimal` type.

### BR-PAY02: Lưu tỷ giá tại thời điểm đặt hàng
- **Rule:** `orders.exchangeRate` phải được điền khi tạo đơn. Đây là tỷ giá tại thời điểm đặt, không thay đổi sau.
- **Lý do:** Dùng cho báo cáo doanh thu và đối soát kế toán.

### BR-PAY03: Verify signature webhook trước khi xử lý
- **Rule:** Stripe: verify `stripe-signature` header. VNPay: verify `vnp_SecureHash`.
- **Enforcement:** Từ chối mọi webhook không có signature hợp lệ với HTTP 400.
- **Lý do:** Tránh giả mạo webhook để gian lận thanh toán.

### BR-PAY04: Idempotency — xử lý webhook 1 lần
- **Rule:** Kiểm tra `payments.providerTxId` trước khi xử lý webhook. Nếu đã tồn tại, bỏ qua (trả 200 OK) — không xử lý lại.
- **Lý do:** Cổng thanh toán có thể gửi webhook nhiều lần.

### BR-PAY05: Stripe webhook phải dùng raw body
- **Rule:** Route Stripe webhook phải được mount **trước** `express.json()` middleware và dùng `express.raw({ type: 'application/json' })`.
- **Lý do:** Stripe verify signature dựa trên raw body — nếu đã parse JSON thì signature sẽ fail.

---

## 5. Quy tắc về bảo mật

### BR-SEC01: Mật khẩu hash bcrypt với cost factor 12
- **Rule:** Mật khẩu PHẢI được hash bằng `bcrypt` với `saltRounds = 12` trước khi lưu database.
- **Không bao giờ:** Lưu mật khẩu dạng plain text hoặc reversible encryption.
- **Enforcement:** Service `hashPassword()` bắt buộc dùng khi set password.

### BR-SEC02: JWT access token hết hạn 15 phút
- **Rule:** `JWT_ACCESS_EXPIRES_IN = 15m`. Access token phải ngắn để giảm rủi ro nếu bị lộ.
- **Renewal:** Dùng refresh token (30 ngày) để lấy access token mới — xử lý tự động ở `api.ts` interceptor.

### BR-SEC03: Refresh token hết hạn 30 ngày
- **Rule:** `JWT_REFRESH_EXPIRES_IN = 30d`. Lưu trong httpOnly cookie, không accessible bằng JavaScript.
- **Security:** httpOnly + Secure + SameSite=Strict cookie attributes.

### BR-SEC04: Khóa tài khoản sau 5 lần sai mật khẩu
- **Rule:** Sau 5 lần `login_attempts.success = false` trong vòng 15 phút từ cùng email/IP:
  1. Tài khoản bị khóa tạm thời 15 phút
  2. Trả về lỗi `423 Tài khoản tạm khóa, thử lại sau X phút`
- **Enforcement:** Check `login_attempts` trước khi verify password.

### BR-SEC05: Mọi thao tác Admin phải ghi Audit Log
- **Rule:** Tất cả các action tạo/sửa/xóa trên resources quan trọng đều PHẢI ghi `audit_logs`.
- **Resources bắt buộc:** Products, Orders, Users, Roles, Settings, Payments (refund), Inventory.
- **Ghi bắt buộc:** `actorId`, `action`, `resourceType`, `resourceId`, `oldValue`, `newValue`.

### BR-SEC06: Validate và sanitize mọi input từ người dùng
- **Rule:** Dùng Zod schema validate tất cả request body, query params. Không tin tưởng dữ liệu từ client.
- **Đặc biệt:** Rich text (HTML từ editor) phải sanitize để chặn XSS.

### BR-SEC07: Rate limiting theo endpoint nhạy cảm
- **Rule:**
  - `/auth/login`: 5 requests/phút/IP
  - `/auth/register`: 3 requests/phút/IP
  - `/auth/forgot-password`: 3 requests/phút/email
  - Tất cả API: 200 requests/15 phút/IP

### BR-SEC08: Không lưu thông tin thẻ tín dụng
- **Rule:** Tuyệt đối không lưu số thẻ, CVV, ngày hết hạn thẻ trong database.
- **Delegate:** Toàn bộ thông tin thẻ do Stripe xử lý và tokenize. Backend chỉ làm việc với `paymentIntentId`.

---

## 6. Quy tắc về người dùng

### BR-U01: Email là unique và case-insensitive
- **Rule:** `user@example.com` và `USER@EXAMPLE.COM` là 1 email. Lưu lowercase, validate lowercase.
- **Enforcement:** `email.toLowerCase()` trước khi save và query.

### BR-U02: Không hard delete user có đơn hàng
- **Rule:** Nếu user có bất kỳ đơn hàng nào, chỉ được soft delete (`deletedAt = now()`), không xóa vĩnh viễn.
- **Lý do:** Dữ liệu đơn hàng phải giữ nguyên cho kế toán và pháp lý.

### BR-U03: Địa chỉ mặc định — chỉ 1 mỗi user
- **Rule:** Mỗi user chỉ có 1 địa chỉ `isDefault = true`. Khi set địa chỉ mới là default, tự động unset tất cả địa chỉ default cũ.

### BR-U04: User chỉ xem đơn hàng của mình
- **Rule:** API `GET /orders/:id` phải kiểm tra `order.userId = req.user.id`. Admin/Support bypass điều kiện này.
- **Enforcement:** Middleware hoặc service-level check.

---

## 7. Quy tắc về nội dung

### BR-C01: Slug bài viết và trang CMS phải unique
- **Rule:** Tương tự sản phẩm, slug của `posts` và `pages` phải unique.
- **Không thể trùng:** Giữa posts và pages (có thể gây conflict URL routing).

### BR-C02: Đánh giá phải qua moderation
- **Rule:** Review mới tạo mặc định `status = pending`. Chỉ hiển thị trên storefront khi `status = approved`.
- **Verified purchase:** Nếu không có `orderItemId` hợp lệ, `isVerifiedPurchase = false`.

### BR-C03: Chỉ đánh giá sản phẩm đã mua và đã giao thành công
- **Rule:** Khi tạo review, phải có `orderItemId` trỏ đến order item thuộc đơn hàng `status = delivered` của user đó.
- **Enforcement:** Service validate orderItem + order status trước khi tạo review.

### BR-C04: Không được đánh giá cùng 1 sản phẩm 2 lần
- **Rule:** 1 user chỉ có 1 review cho 1 `productId`.
- **Enforcement:** Unique constraint tại tầng service (kiểm tra trước khi insert).

---

## 8. Quy tắc về hiệu suất và giới hạn hệ thống

### BR-SYS01: Giới hạn file upload
| Loại | Giới hạn |
|------|----------|
| Kích thước file đơn | 10MB |
| Số file upload 1 lần | 10 files |
| Định dạng ảnh | JPG, JPEG, PNG, WebP |
| Số ảnh tối đa / sản phẩm | 20 ảnh |

### BR-SYS02: Giới hạn pagination
| Endpoint | Mặc định | Tối đa |
|----------|----------|--------|
| Danh sách sản phẩm | 24 | 100 |
| Danh sách đơn hàng | 20 | 100 |
| Danh sách admin | 20 | 200 |
| Kết quả tìm kiếm | 24 | 100 |

### BR-SYS03: Timeout và giới hạn request
| Loại | Giá trị |
|------|---------|
| Database query timeout | 5 giây |
| API response timeout | 30 giây |
| Request body tối đa | 10MB |
| Import hàng loạt | 500 records/lần |

### BR-SYS04: Cache TTL
| Dữ liệu | TTL |
|---------|-----|
| Danh sách sản phẩm (public) | 60 giây |
| Chi tiết sản phẩm | 5 phút |
| Danh sách danh mục | 10 phút |
| Settings công khai | 1 giờ |
| Session data | Theo expiresAt |

### BR-SYS05: Feature flags - fallback behavior
- **Rule:** Nếu không tìm thấy feature flag trong Redis hoặc DB, hành vi mặc định là **tắt** (false).
- **Lý do:** An toàn hơn khi thiếu config — không bật tính năng chưa sẵn sàng.

---

## 9. Câu hỏi thường gặp

**Q: Tại sao JWT access token chỉ 15 phút thay vì lâu hơn?**
> Access token được gửi trong mọi request API. Nếu bị lộ (XSS, man-in-middle), attacker chỉ có 15 phút để lạm dụng. Refresh token (30 ngày) lưu trong httpOnly cookie không đọc được bằng JavaScript nên an toàn hơn.

**Q: Decimal(12,4) nghĩa là gì?**
> 12 chữ số tổng, trong đó 4 chữ số sau dấu thập phân. Tức là giá trị tối đa là 99,999,999.9999 — đủ cho hầu hết sản phẩm. Ví dụ: `250000.0000` VND, `9.9900` USD.

**Q: Luật BR-PAY05 (Stripe raw body) có ảnh hưởng đến các route khác không?**
> Không, nếu mount đúng thứ tự. Stripe webhook route phải được đăng ký **trước** `app.use(express.json())`. Các route khác vẫn dùng JSON parser bình thường. Xem `apps/api/src/app.ts` — payment route được mount trước json middleware.

**Q: Nếu webhook bị gửi lại 2 lần (double delivery) thì sao?**
> BR-PAY04 đảm bảo idempotency: hệ thống check `providerTxId` trong bảng `payments`. Nếu đã xử lý rồi → bỏ qua và trả `200 OK`. VNPay và Stripe đều có cơ chế retry nên luật này rất quan trọng.

**Q: Tôi cần thêm luật nghiệp vụ mới, làm thế nào?**
> Thêm vào file này theo format: `BR-{NHÓM}{SỐ}: Tên luật`. Sau đó implement trong tầng **service** (không phải controller hay middleware). Viết unit test cho luật mới. Cập nhật tài liệu API nếu ảnh hưởng đến response.

**Q: Luật nào có thể override bởi config/feature flag?**
> Các luật kỹ thuật (BR-P01, BR-PAY01...) là bất biến. Một số luật nghiệp vụ linh hoạt có thể được điều chỉnh qua `system_configs`: thời hạn hoàn trả (BR-O07), số ngày giỏ hàng hết hạn, threshold rate limit... Tuy nhiên các luật bảo mật (BR-SEC*) không được override.
