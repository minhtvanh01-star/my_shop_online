# Tài liệu 06 — API Endpoints

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Danh sách API Endpoints |
| **Phiên bản** | 1.0.0 |
| **Ngày tạo** | 2026-05-30 |
| **Người tạo** | Anh Minh Phạm Vũ |

---

## Quy ước chung

- **Base URL:** `https://api.myshop.com/api/v1`
- **Auth:** Bearer token trong header `Authorization: Bearer <accessToken>`
- **Content-Type:** `application/json` (trừ upload file dùng `multipart/form-data`)
- **Response thành công:** `{ "data": ... }`
- **Response lỗi:** `{ "error": "...", "code": "...", "details": {...} }`
- **Pagination:** `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`

**Ký hiệu phân quyền:**
- 🌐 Public — không cần đăng nhập
- 🔐 Customer — cần đăng nhập (bất kỳ role)
- 🛡️ Admin — cần role ADMIN hoặc SUPER_ADMIN
- 🏭 Warehouse — cần role WAREHOUSE trở lên
- 👷 Support — cần role SUPPORT trở lên

---

## Mục lục

1. [Auth](#1-auth)
2. [Products](#2-products)
3. [Categories](#3-categories)
4. [Cart](#4-cart)
5. [Orders](#5-orders)
6. [Payments](#6-payments)
7. [Reviews](#7-reviews)
8. [Wishlist](#8-wishlist)
9. [Users](#9-users)
10. [Admin](#10-admin)
11. [Blog & Pages](#11-blog--pages)
12. [Media](#12-media)
13. [Settings](#13-settings)

---

## 1. Auth

### POST /auth/register
Đăng ký tài khoản mới.
- **Auth:** 🌐 Public
- **Body:**
  ```json
  { "email": "user@example.com", "password": "Abc12345!", "fullName": "Nguyễn Văn A" }
  ```
- **Response 201:** `{ "data": { "user": {...}, "accessToken": "..." } }`
- **Lỗi:** `409 Email đã tồn tại` | `422 Validation failed`

---

### POST /auth/login
Đăng nhập và nhận access token.
- **Auth:** 🌐 Public
- **Body:**
  ```json
  { "email": "user@example.com", "password": "Abc12345!" }
  ```
- **Response 200:** `{ "data": { "user": {...}, "accessToken": "..." } }`
- **Side effect:** Set httpOnly cookie `refresh_token`
- **Lỗi:** `401 Email hoặc mật khẩu không đúng` | `423 Tài khoản bị khóa tạm thời`

---

### POST /auth/refresh
Đổi refresh token lấy access token mới.
- **Auth:** 🌐 Public (dùng httpOnly cookie refresh_token)
- **Body:** Không cần
- **Response 200:** `{ "data": { "accessToken": "..." } }`
- **Lỗi:** `401 Refresh token không hợp lệ hoặc đã hết hạn`

---

### POST /auth/logout
Đăng xuất, vô hiệu hóa refresh token.
- **Auth:** 🔐 Customer
- **Body:** Không cần
- **Response 200:** `{ "data": { "message": "Logged out" } }`
- **Side effect:** Xóa httpOnly cookie, đánh dấu session hết hạn

---

### POST /auth/forgot-password
Gửi email reset mật khẩu.
- **Auth:** 🌐 Public
- **Body:** `{ "email": "user@example.com" }`
- **Response 200:** `{ "data": { "message": "Email sent if account exists" } }`
- **Lưu ý:** Luôn trả 200 dù email không tồn tại (tránh email enumeration)

---

### POST /auth/reset-password
Đặt lại mật khẩu với token từ email.
- **Auth:** 🌐 Public
- **Body:** `{ "token": "...", "newPassword": "NewPass123!" }`
- **Response 200:** `{ "data": { "message": "Password updated" } }`
- **Lỗi:** `400 Token không hợp lệ hoặc đã hết hạn`

---

### POST /auth/verify-email
Xác thực email với token.
- **Auth:** 🌐 Public
- **Body:** `{ "token": "..." }`
- **Response 200:** `{ "data": { "message": "Email verified" } }`

---

## 2. Products

### GET /products
Danh sách sản phẩm (public, có phân trang và lọc).
- **Auth:** 🌐 Public
- **Query params:** `page`, `limit`, `category`, `q` (search), `minPrice`, `maxPrice`, `sort` (newest|priceAsc|priceDesc|popular), `tags`, `inStock`
- **Response 200:** Paginated list of products (kèm ảnh đại diện, giá, rating)

---

### GET /products/:slug
Chi tiết sản phẩm theo slug.
- **Auth:** 🌐 Public
- **Response 200:** Product đầy đủ (translations, variants, images, prices, reviews summary)
- **Lỗi:** `404 Sản phẩm không tồn tại`

---

### POST /products
Tạo sản phẩm mới.
- **Auth:** 🛡️ Admin
- **Body:**
  ```json
  {
    "categoryId": "uuid", "sku": "SP001", "basePrice": 250000, "currency": "VND",
    "stockQuantity": 100, "translations": [
      { "locale": "vi", "name": "Áo thun", "description": "..." },
      { "locale": "en", "name": "T-shirt", "description": "..." }
    ]
  }
  ```
- **Response 201:** Sản phẩm vừa tạo
- **Lỗi:** `409 SKU đã tồn tại` | `422 Validation failed`

---

### PUT /products/:id
Cập nhật thông tin sản phẩm.
- **Auth:** 🛡️ Admin
- **Body:** Các trường cần cập nhật (partial update)
- **Response 200:** Sản phẩm sau cập nhật
- **Lỗi:** `404 Not found` | `422 Validation failed`

---

### DELETE /products/:id
Xóa mềm sản phẩm.
- **Auth:** 🛡️ Admin
- **Response 200:** `{ "data": { "message": "Product deleted" } }`
- **Lỗi:** `400 Không thể xóa sản phẩm đang có đơn hàng chưa hoàn thành`

---

### POST /products/:id/images
Upload ảnh sản phẩm.
- **Auth:** 🛡️ Admin
- **Content-Type:** `multipart/form-data`
- **Body:** `files[]` (nhiều file), `isPrimary` (true/false)
- **Response 201:** Danh sách ảnh vừa upload

---

### DELETE /products/:id/images/:imageId
Xóa ảnh sản phẩm.
- **Auth:** 🛡️ Admin
- **Response 200:** OK

---

### GET /products/:id/variants
Danh sách variants của sản phẩm.
- **Auth:** 🌐 Public
- **Response 200:** List of variants

---

### POST /products/:id/variants
Thêm variant mới.
- **Auth:** 🛡️ Admin
- **Body:** `{ "sku": "SP001-RED-M", "optionName": "Màu", "optionValue": "Đỏ", "priceModifier": 0, "stockQuantity": 50 }`
- **Response 201:** Variant vừa tạo

---

## 3. Categories

### GET /categories
Danh sách danh mục dạng cây.
- **Auth:** 🌐 Public
- **Response 200:** List of categories with children

---

### GET /categories/:slug
Chi tiết danh mục + sản phẩm thuộc danh mục.
- **Auth:** 🌐 Public
- **Query:** `page`, `limit`, `sort`
- **Response 200:** Category info + paginated products

---

### POST /categories
Tạo danh mục mới.
- **Auth:** 🛡️ Admin
- **Body:** `{ "name": "Áo", "slug": "ao", "parentId": null, "imageUrl": "..." }`
- **Response 201:** Danh mục vừa tạo

---

### PUT /categories/:id
Cập nhật danh mục.
- **Auth:** 🛡️ Admin
- **Response 200:** Danh mục sau cập nhật

---

### DELETE /categories/:id
Xóa mềm danh mục.
- **Auth:** 🛡️ Admin
- **Lỗi:** `400 Không thể xóa danh mục đang có sản phẩm`

---

## 4. Cart

### GET /cart
Xem giỏ hàng của user hiện tại.
- **Auth:** 🔐 Customer
- **Response 200:** Cart items with product details, prices, stock validation

---

### POST /cart/items
Thêm sản phẩm vào giỏ.
- **Auth:** 🔐 Customer
- **Body:** `{ "productId": "uuid", "variantId": "uuid|null", "quantity": 2 }`
- **Response 200:** Cart item vừa thêm/cập nhật
- **Lỗi:** `400 Sản phẩm hết hàng` | `400 Vượt quá tồn kho`

---

### PUT /cart/items/:itemId
Cập nhật số lượng item trong giỏ.
- **Auth:** 🔐 Customer
- **Body:** `{ "quantity": 3 }`
- **Response 200:** Item sau cập nhật

---

### DELETE /cart/items/:itemId
Xóa item khỏi giỏ.
- **Auth:** 🔐 Customer
- **Response 200:** OK

---

### DELETE /cart
Xóa toàn bộ giỏ hàng.
- **Auth:** 🔐 Customer
- **Response 200:** OK

---

### POST /cart/sync
Đồng bộ giỏ hàng local (guest) lên server sau khi đăng nhập.
- **Auth:** 🔐 Customer
- **Body:** `{ "items": [ { "productId": "...", "variantId": "...", "quantity": 1 } ] }`
- **Response 200:** Server cart sau khi merge

---

## 5. Orders

### GET /orders
Lịch sử đơn hàng của user.
- **Auth:** 🔐 Customer
- **Query:** `page`, `limit`, `status`
- **Response 200:** Paginated orders

---

### GET /orders/:id
Chi tiết một đơn hàng.
- **Auth:** 🔐 Customer (chỉ đơn của mình) / 👷 Support (tất cả đơn)
- **Response 200:** Order full detail (items, payment, shipping)
- **Lỗi:** `403 Không có quyền xem đơn hàng này` | `404 Not found`

---

### POST /orders
Tạo đơn hàng từ giỏ hàng hiện tại.
- **Auth:** 🔐 Customer
- **Body:**
  ```json
  {
    "shippingAddressId": "uuid",
    "paymentMethod": "stripe|vnpay|cod",
    "couponCode": "SUMMER20",
    "shippingMethodId": "uuid",
    "notes": "Ghi chú giao hàng"
  }
  ```
- **Response 201:** `{ "data": { "order": {...}, "paymentUrl": "..." } }`
  - `paymentUrl`: URL redirect sang VNPay (nếu chọn VNPay), `null` với Stripe/COD
- **Lỗi:** `400 Giỏ hàng trống` | `400 Sản phẩm hết hàng` | `400 Coupon không hợp lệ`

---

### PATCH /orders/:id/cancel
Khách hủy đơn hàng.
- **Auth:** 🔐 Customer (chỉ được hủy đơn của mình, status = pending)
- **Body:** `{ "reason": "Tôi đổi ý" }`
- **Response 200:** Order sau khi hủy
- **Lỗi:** `400 Không thể hủy đơn hàng ở trạng thái này`

---

### PATCH /orders/:id/status
Admin cập nhật trạng thái đơn.
- **Auth:** 🛡️ Admin / 🏭 Warehouse (trong phạm vi quyền)
- **Body:** `{ "status": "confirmed|processing|shipped|delivered", "trackingNumber": "...", "note": "..." }`
- **Response 200:** Order sau cập nhật
- **Lỗi:** `400 Chuyển trạng thái không hợp lệ`

---

### GET /orders/admin
Danh sách tất cả đơn hàng (admin view).
- **Auth:** 🛡️ Admin / 👷 Support
- **Query:** `page`, `limit`, `status`, `paymentStatus`, `paymentMethod`, `from`, `to`, `userId`, `q` (tìm theo mã đơn/email)
- **Response 200:** Paginated all orders

---

### POST /orders/:id/refund
Tạo hoàn tiền.
- **Auth:** 🛡️ Admin
- **Body:** `{ "type": "full|partial", "amount": 50000, "reason": "Hàng lỗi" }`
- **Response 200:** Refund result

---

## 6. Payments

### POST /payments/stripe/intent
Tạo Stripe PaymentIntent để nhúng form thẻ.
- **Auth:** 🔐 Customer
- **Body:** `{ "orderId": "uuid" }`
- **Response 200:** `{ "data": { "clientSecret": "pi_xxx_secret_xxx" } }`

---

### POST /payments/stripe/webhook
Nhận webhook từ Stripe.
- **Auth:** 🌐 Public (verify Stripe signature)
- **Content-Type:** `application/octet-stream` (raw body)
- **Response 200:** OK
- **Lưu ý:** Mount riêng trước `express.json()` middleware

---

### POST /payments/vnpay/create
Tạo URL thanh toán VNPay.
- **Auth:** 🔐 Customer
- **Body:** `{ "orderId": "uuid" }`
- **Response 200:** `{ "data": { "paymentUrl": "https://sandbox.vnpayment.vn/..." } }`

---

### GET /payments/vnpay/return
Xử lý redirect return từ VNPay sau khi khách thanh toán.
- **Auth:** 🌐 Public (verify VNPay checksum)
- **Query:** VNPay params (`vnp_TxnRef`, `vnp_ResponseCode`, `vnp_SecureHash`, ...)
- **Response:** Redirect sang trang kết quả trên frontend

---

### POST /payments/vnpay/ipn
Nhận IPN callback từ VNPay (server-to-server).
- **Auth:** 🌐 Public (verify VNPay signature)
- **Query:** VNPay IPN params
- **Response 200:** `{ "RspCode": "00", "Message": "Confirm Success" }`

---

## 7. Reviews

### GET /reviews
Danh sách đánh giá theo sản phẩm.
- **Auth:** 🌐 Public
- **Query:** `productId` (required), `page`, `limit`, `rating`
- **Response 200:** Paginated reviews with user info

---

### POST /reviews
Tạo đánh giá sản phẩm.
- **Auth:** 🔐 Customer
- **Body:** `{ "productId": "uuid", "orderItemId": "uuid", "rating": 5, "title": "Rất tốt", "body": "Chất lượng tuyệt vời..." }`
- **Response 201:** Review vừa tạo (status: pending)
- **Lỗi:** `400 Bạn chưa mua sản phẩm này` | `409 Bạn đã đánh giá sản phẩm này rồi`

---

### PUT /reviews/:id
Chỉnh sửa đánh giá.
- **Auth:** 🔐 Customer (chỉ review của mình, chưa được duyệt)
- **Body:** `{ "rating": 4, "title": "...", "body": "..." }`
- **Response 200:** Review sau cập nhật

---

### DELETE /reviews/:id
Xóa đánh giá.
- **Auth:** 🔐 Customer (của mình) / 🛡️ Admin (tất cả)
- **Response 200:** OK

---

### PATCH /reviews/:id/approve
Duyệt hoặc từ chối đánh giá.
- **Auth:** 🛡️ Admin
- **Body:** `{ "status": "approved|rejected", "rejectedReason": "..." }`
- **Response 200:** Review sau duyệt

---

## 8. Wishlist

### GET /wishlist
Danh sách yêu thích của user.
- **Auth:** 🔐 Customer
- **Response 200:** List of wishlist items with product details

---

### POST /wishlist/:productId
Thêm sản phẩm vào wishlist.
- **Auth:** 🔐 Customer
- **Body:** `{ "variantId": "uuid|null" }`
- **Response 201:** Wishlist item
- **Lỗi:** `409 Đã có trong danh sách yêu thích`

---

### DELETE /wishlist/:productId
Xóa sản phẩm khỏi wishlist.
- **Auth:** 🔐 Customer
- **Query:** `variantId` (optional)
- **Response 200:** OK

---

## 9. Users

### GET /users/me
Thông tin profile của user hiện tại.
- **Auth:** 🔐 Customer
- **Response 200:** User profile

---

### PUT /users/me
Cập nhật thông tin cá nhân.
- **Auth:** 🔐 Customer
- **Body:** `{ "fullName": "...", "phone": "...", "locale": "vi" }`
- **Response 200:** Profile sau cập nhật

---

### PUT /users/me/password
Đổi mật khẩu.
- **Auth:** 🔐 Customer
- **Body:** `{ "currentPassword": "...", "newPassword": "..." }`
- **Response 200:** OK
- **Lỗi:** `401 Mật khẩu hiện tại không đúng`

---

### GET /users/me/addresses
Danh sách địa chỉ giao hàng.
- **Auth:** 🔐 Customer
- **Response 200:** List of addresses

---

### POST /users/me/addresses
Thêm địa chỉ mới.
- **Auth:** 🔐 Customer
- **Body:** `{ "recipientName": "...", "phone": "...", "addressLine1": "...", "city": "...", "countryCode": "VN", "isDefault": false }`
- **Response 201:** Address mới

---

### PUT /users/me/addresses/:id
Cập nhật địa chỉ.
- **Auth:** 🔐 Customer
- **Response 200:** Address sau cập nhật

---

### DELETE /users/me/addresses/:id
Xóa địa chỉ.
- **Auth:** 🔐 Customer
- **Lỗi:** `400 Không thể xóa địa chỉ mặc định khi còn địa chỉ khác`

---

## 10. Admin

### GET /admin/dashboard
Thống kê tổng quan dashboard.
- **Auth:** 🛡️ Admin
- **Query:** `period` (today|week|month|year)
- **Response 200:**
  ```json
  {
    "data": {
      "revenue": 15000000,
      "orders": { "total": 142, "pending": 8, "shipped": 23 },
      "customers": { "total": 523, "new": 14 },
      "products": { "total": 89, "outOfStock": 3 }
    }
  }
  ```

---

### GET /admin/users
Danh sách tất cả người dùng.
- **Auth:** 🛡️ Admin
- **Query:** `page`, `limit`, `q`, `role`, `isActive`
- **Response 200:** Paginated users

---

### PATCH /admin/users/:id/status
Kích hoạt / vô hiệu hóa tài khoản.
- **Auth:** 🛡️ Admin
- **Body:** `{ "isActive": false, "reason": "..." }`
- **Response 200:** User sau cập nhật

---

### POST /admin/users/:id/roles
Gán vai trò cho người dùng.
- **Auth:** 🛡️ Admin (chỉ gán roles thấp hơn mình) / Super Admin (tất cả)
- **Body:** `{ "roleId": "uuid", "expiresAt": "2026-12-31T00:00:00Z" }`
- **Response 200:** UserRole mới

---

### GET /admin/audit-logs
Xem audit log.
- **Auth:** 🛡️ Admin (Super Admin xem cả sensitive)
- **Query:** `page`, `limit`, `actorId`, `resourceType`, `action`, `from`, `to`
- **Response 200:** Paginated audit logs

---

## 11. Blog & Pages

### GET /blog
Danh sách bài viết đã published.
- **Auth:** 🌐 Public
- **Query:** `page`, `limit`, `categoryId`, `locale`
- **Response 200:** Paginated posts

---

### GET /blog/:slug
Chi tiết bài viết.
- **Auth:** 🌐 Public
- **Query:** `locale`
- **Response 200:** Post with translations

---

### POST /blog
Tạo bài viết mới.
- **Auth:** 🛡️ Admin / Content Editor
- **Body:** `{ "categoryId": "uuid", "status": "draft", "translations": [ { "locale": "vi", "title": "...", "content": "..." } ] }`
- **Response 201:** Post vừa tạo

---

### PUT /blog/:id
Cập nhật bài viết.
- **Auth:** 🛡️ Admin / Content Editor (chỉ bài của mình)
- **Response 200:** Post sau cập nhật

---

### DELETE /blog/:id
Xóa mềm bài viết.
- **Auth:** 🛡️ Admin
- **Response 200:** OK

---

### GET /pages/:slug
Xem trang CMS.
- **Auth:** 🌐 Public
- **Response 200:** Page với nội dung theo locale

---

## 12. Media

### POST /media/upload
Upload một file lên Cloudflare R2.
- **Auth:** 🛡️ Admin / Content Editor
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (binary), `folder` (optional: "products"|"blog"|"pages")
- **Response 201:** `{ "data": { "url": "...", "cdnUrl": "...", "filename": "...", "mimeType": "...", "fileSizeBytes": 102400 } }`
- **Lỗi:** `413 File quá lớn (max 10MB)` | `415 Định dạng không hỗ trợ`

---

### POST /media/upload/bulk
Upload nhiều file cùng lúc.
- **Auth:** 🛡️ Admin
- **Body:** `files[]` (tối đa 10 file/request)
- **Response 201:** List of uploaded files

---

### GET /media
Thư viện media (Admin).
- **Auth:** 🛡️ Admin
- **Query:** `page`, `limit`, `folder`, `mimeType`
- **Response 200:** Paginated media files

---

### DELETE /media/:id
Xóa file khỏi R2 và database.
- **Auth:** 🛡️ Admin
- **Response 200:** OK
- **Lỗi:** `400 File đang được sử dụng bởi sản phẩm hoặc bài viết`

---

## 13. Settings

### GET /settings
Cài đặt công khai (tên shop, currency, timezone...).
- **Auth:** 🌐 Public
- **Response 200:** Object các setting `isPublic = true`

---

### GET /settings/admin
Tất cả cài đặt hệ thống.
- **Auth:** 🛡️ Admin
- **Response 200:** Object tất cả settings (kể cả internal)

---

### PUT /settings/:key
Cập nhật một setting.
- **Auth:** 🛡️ Admin (SUPER_ADMIN cho các setting nhạy cảm)
- **Body:** `{ "value": "..." }`
- **Response 200:** Setting sau cập nhật

---

### GET /settings/features
Danh sách feature flags.
- **Auth:** 🛡️ Admin
- **Response 200:** List of feature flags với trạng thái on/off

---

### PATCH /settings/features/:key
Bật/tắt feature flag.
- **Auth:** 🛡️ Super Admin
- **Body:** `{ "isEnabled": true }`
- **Response 200:** Feature flag sau cập nhật

---

## Câu hỏi thường gặp

**Q: Tại sao VNPay có 2 callback (`/return` và `/ipn`)?**
> `/return` là redirect URL — VNPay redirect browser của khách về sau khi thanh toán (không đáng tin cậy, có thể bị mất nếu khách tắt tab). `/ipn` là server-to-server callback của VNPay gửi về backend — đây là nguồn dữ liệu **đáng tin cậy** để cập nhật trạng thái đơn hàng.

**Q: Rate limiting hoạt động thế nào?**
> Mặc định: 200 requests/15 phút/IP. Riêng `/auth/login`: 5 lần/phút/IP. Dùng Redis để lưu counter, tránh bypass khi restart server.

**Q: API có hỗ trợ GraphQL không?**
> Hiện tại chỉ REST. GraphQL có thể xem xét sau khi REST API ổn định và có nhu cầu từ mobile app.

**Q: Làm sao frontend biết user đang ở thị trường nào?**
> Dựa vào locale từ next-intl (`vi` hoặc `en`). Frontend gửi header `Accept-Language` hoặc query param `locale`. Backend dùng để trả về giá đúng currency và nội dung đúng ngôn ngữ.
