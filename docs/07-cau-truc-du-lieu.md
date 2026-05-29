# Tài liệu 07 — Cấu trúc dữ liệu (Database Schema)

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Mô tả cấu trúc database — 41 bảng |
| **Phiên bản** | 1.0.0 |
| **Ngày tạo** | 2026-05-30 |
| **Người tạo** | Anh Minh Phạm Vũ |

---

## Tổng quan

Database sử dụng **PostgreSQL**, quản lý qua **Prisma ORM**. Toàn bộ **41 bảng** được tổ chức thành 10 nhóm chức năng:

| Nhóm | Số bảng | Chức năng |
|------|---------|-----------|
| 1. Users & Auth | 4 | Tài khoản, phiên đăng nhập, OAuth, địa chỉ |
| 2. Products & Catalog | 8 | Sản phẩm, biến thể, ảnh, giá, danh mục, tags |
| 3. Wishlist | 1 | Danh sách yêu thích |
| 4. Orders & Payments | 6 | Đơn hàng, thanh toán, giỏ hàng, coupon |
| 5. Shipping | 1 | Phương thức vận chuyển |
| 6. Roles & Permissions | 5 | RBAC — phân quyền |
| 7. Audit & Activity | 5 | Nhật ký, thông báo, email log |
| 8. Inventory & Reviews | 3 | Tồn kho, cảnh báo, đánh giá |
| 9. Blog & CMS | 6 | Bài viết, trang tĩnh, media |
| 10. Config | 2 | Cấu hình hệ thống, feature flags |

**Quy ước chung:**
- Tất cả `id` dùng **UUID v4** (`gen_random_uuid()`)
- Các bảng quan trọng có **soft delete**: `deletedAt`, `deletedBy`
- Các bảng có audit: `createdBy`, `updatedBy`
- Tiền tệ dùng `Decimal(12,4)` — không bao giờ dùng `float`

---

## Nhóm 1 — Users & Auth

### 1. `users`
**Mục đích:** Lưu thông tin tất cả người dùng (cả khách hàng và nhân viên admin).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Primary key |
| `email` | String UNIQUE | Email đăng nhập |
| `passwordHash` | String? | Mật khẩu đã hash bcrypt (null nếu đăng nhập OAuth) |
| `fullName` | String | Họ và tên |
| `phone` | String? | Số điện thoại |
| `locale` | String | Ngôn ngữ ưa dùng: `vi` hoặc `en` |
| `countryCode` | String? | Quốc gia (VN, US, ...) |
| `isVerified` | Boolean | Email đã xác thực chưa |
| `isActive` | Boolean | Tài khoản đang hoạt động |
| `deletedAt` | DateTime? | Soft delete |

**Quan hệ:** → `sessions`, `oauth_accounts`, `user_addresses`, `orders`, `cart_items`, `wishlists`, `user_roles`, `admin_accounts`, `audit_logs`, `reviews`, `media_files`

**Index:** `isActive`, `email` (unique)

---

### 2. `sessions`
**Mục đích:** Lưu refresh token sessions. Mỗi thiết bị đăng nhập tạo 1 session.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Primary key |
| `userId` | UUID | FK → users |
| `tokenHash` | String UNIQUE | Hash của refresh token (không lưu raw token) |
| `deviceInfo` | String? | Browser/device user agent |
| `ipAddress` | String? | IP đăng nhập |
| `expiresAt` | DateTime | Ngày hết hạn session |

**Quan hệ:** → `users` (Cascade delete)  
**Index:** `userId`

> **Bảo mật:** Lưu `tokenHash` thay vì raw token. Khi verify: hash token đến và so sánh với hash trong DB.

---

### 3. `oauth_accounts`
**Mục đích:** Liên kết tài khoản với OAuth providers (Google, Facebook...).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Primary key |
| `userId` | UUID | FK → users |
| `provider` | String | `google`, `facebook`, `github` |
| `providerUserId` | String | ID từ provider |
| `providerData` | Json? | Raw data từ provider |

**Constraint:** UNIQUE(`provider`, `providerUserId`) — 1 tài khoản Google không thể liên kết 2 user

---

### 4. `user_addresses`
**Mục đích:** Sổ địa chỉ giao hàng của khách hàng.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Primary key |
| `userId` | UUID | FK → users |
| `label` | String? | Nhãn: Nhà, Công ty, ... |
| `recipientName` | String | Tên người nhận |
| `phone` | String? | SĐT người nhận |
| `addressLine1` | String | Số nhà, tên đường |
| `city` | String | Thành phố |
| `countryCode` | String | ISO country code |
| `isDefault` | Boolean | Địa chỉ mặc định |

**Quan hệ:** → `users` (Cascade delete)

---

## Nhóm 2 — Products & Catalog

### 5. `categories`
**Mục đích:** Cây danh mục sản phẩm, hỗ trợ đa cấp (parent-child).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Primary key |
| `parentId` | UUID? | FK tự tham chiếu (null = danh mục gốc) |
| `slug` | String UNIQUE | URL-friendly identifier |
| `name` | String | Tên danh mục |
| `imageUrl` | String? | Ảnh đại diện danh mục |
| `sortOrder` | Int | Thứ tự hiển thị |

**Quan hệ:** Tự tham chiếu `CategorySelf` (parent ↔ children) → `products`  
**Soft delete:** `deletedAt`, `deletedBy`

---

### 6. `products`
**Mục đích:** Bảng chính của catalog sản phẩm. Lưu thông tin kỹ thuật; nội dung ngôn ngữ ở `product_translations`.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Primary key |
| `categoryId` | UUID | FK → categories |
| `slug` | String UNIQUE | URL của sản phẩm |
| `sku` | String UNIQUE | Mã sản phẩm — unique toàn hệ thống |
| `basePrice` | Decimal(12,4) | Giá cơ sở |
| `currency` | String | Tiền tệ của basePrice (mặc định `USD`) |
| `stockQuantity` | Int | Tồn kho (tổng nếu có variants) |
| `isActive` | Boolean | Đang bán |
| `isFeatured` | Boolean | Sản phẩm nổi bật |
| `attributes` | Json? | Metadata tùy chỉnh (markets, backorder...) |

**Index:** `categoryId`, `isActive`, `isFeatured`  
**Soft delete:** `deletedAt`, `deletedBy`

---

### 7. `product_translations`
**Mục đích:** Nội dung đa ngôn ngữ của sản phẩm.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | FK → products |
| `locale` | String | `vi` hoặc `en` |
| `name` | String | Tên sản phẩm theo ngôn ngữ |
| `description` | String? | Mô tả đầy đủ (HTML) |
| `metaTitle` | String? | SEO title |
| `metaDescription` | String? | SEO description |

**Constraint:** UNIQUE(`productId`, `locale`) — 1 sản phẩm chỉ có 1 bản dịch mỗi ngôn ngữ

---

### 8. `product_variants`
**Mục đích:** Biến thể sản phẩm (Size S/M/L, Màu Đỏ/Xanh...).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | FK → products |
| `sku` | String UNIQUE | SKU riêng của variant |
| `optionName` | String | Tên thuộc tính: "Size", "Màu" |
| `optionValue` | String | Giá trị: "M", "Đỏ" |
| `priceModifier` | Decimal(12,4) | Điều chỉnh giá (+/-) so với giá gốc |
| `stockQuantity` | Int | Tồn kho riêng |
| `imageUrl` | String? | Ảnh riêng cho variant |

**Soft delete:** `deletedAt`, `deletedBy`

---

### 9. `product_images`
**Mục đích:** Thư viện ảnh của sản phẩm (nhiều ảnh/sản phẩm).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | FK → products |
| `url` | String | URL trên Cloudflare R2 |
| `altText` | String? | Alt text cho SEO/accessibility |
| `sortOrder` | Int | Thứ tự hiển thị |
| `isPrimary` | Boolean | Ảnh đại diện (chỉ 1 ảnh/sản phẩm) |

---

### 10. `product_prices`
**Mục đích:** Giá theo từng thị trường/tiền tệ.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | FK → products |
| `currency` | String | ISO currency: VND, USD, EUR |
| `amount` | Decimal(12,4) | Giá bán |
| `compareAt` | Decimal(12,4)? | Giá so sánh (giá cũ để gạch ngang) |
| `countryCode` | String? | Null = áp dụng cho tất cả quốc gia dùng currency này |

**Constraint:** UNIQUE(`productId`, `currency`, `countryCode`)

---

### 11. `tags`
**Mục đích:** Tags để phân loại và tìm kiếm sản phẩm.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `name` | String UNIQUE | Tên tag |
| `slug` | String UNIQUE | URL-friendly |
| `color` | String? | Màu hiển thị trong UI (#hex) |

**Soft delete:** `deletedAt`, `deletedBy`

---

### 12. `product_tags`
**Mục đích:** Bảng quan hệ nhiều-nhiều giữa sản phẩm và tags.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | FK → products |
| `tagId` | UUID | FK → tags |

**Constraint:** UNIQUE(`productId`, `tagId`)

---

## Nhóm 3 — Wishlist

### 13. `wishlists`
**Mục đích:** Danh sách sản phẩm yêu thích của từng user.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `userId` | UUID | FK → users |
| `productId` | UUID | FK → products |
| `variantId` | UUID? | FK → product_variants (null nếu không chọn variant) |

**Constraint:** UNIQUE(`userId`, `productId`, `variantId`) — không thêm trùng

---

## Nhóm 4 — Orders & Payments

### 14. `orders`
**Mục đích:** Thông tin đơn hàng. Bất biến sau khi tạo.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `orderNumber` | String UNIQUE | Mã đơn: `ORD-YYYYMMDD-XXXXX` |
| `userId` | UUID? | FK → users (null nếu guest, SetNull khi user bị xóa) |
| `status` | Enum | pending→confirmed→processing→shipped→delivered→cancelled→refunded |
| `currency` | String | Tiền tệ của đơn |
| `subtotal` | Decimal(12,4) | Tạm tính (chưa ship, chưa discount) |
| `shippingFee` | Decimal(12,4) | Phí vận chuyển |
| `discountAmount` | Decimal(12,4) | Tổng giảm giá (coupon) |
| `taxAmount` | Decimal(12,4) | Thuế |
| `totalAmount` | Decimal(12,4) | Tổng tiền phải trả |
| `exchangeRate` | Decimal(12,4) | Tỷ giá tại thời điểm đặt |
| `shippingAddress` | Json | **Snapshot** địa chỉ giao hàng |
| `trackingNumber` | String? | Mã vận đơn |

**Index:** `userId`, `status`, `createdAt`

> **Quan trọng:** `shippingAddress` lưu dạng JSON snapshot — không dùng FK để địa chỉ không thay đổi dù user sau này sửa địa chỉ.

---

### 15. `order_items`
**Mục đích:** Danh sách sản phẩm trong một đơn hàng. Snapshot giá tại thời điểm mua.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `orderId` | UUID | FK → orders |
| `productId` | UUID | FK → products |
| `variantId` | UUID? | FK → product_variants |
| `productName` | String | **Snapshot** tên sản phẩm |
| `sku` | String | **Snapshot** SKU |
| `quantity` | Int | Số lượng |
| `unitPrice` | Decimal(12,4) | **Snapshot** đơn giá tại thời điểm mua |
| `totalPrice` | Decimal(12,4) | unitPrice × quantity |
| `productSnapshot` | Json | Toàn bộ thông tin sản phẩm lúc mua |

> **Quy tắc:** Giá trong `order_items` không bao giờ thay đổi dù admin sau này sửa giá sản phẩm.

---

### 16. `payments`
**Mục đích:** Bản ghi giao dịch thanh toán (mỗi đơn có thể có nhiều lần thử).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `orderId` | UUID | FK → orders |
| `provider` | String | `stripe`, `vnpay`, `cod` |
| `providerTxId` | String UNIQUE | ID giao dịch từ cổng thanh toán |
| `status` | Enum | pending→completed→failed→refunded |
| `amount` | Decimal(12,4) | Số tiền |
| `providerResponse` | Json? | Raw response từ cổng TT (để debug) |
| `paidAt` | DateTime? | Thời điểm thanh toán thành công |

---

### 17. `coupons`
**Mục đích:** Mã giảm giá.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `code` | String UNIQUE | Mã coupon (không phân biệt hoa/thường khi check) |
| `type` | Enum | `percentage` hoặc `fixed` |
| `value` | Decimal(12,4) | Giá trị giảm (% hoặc số tiền) |
| `minOrderAmount` | Decimal? | Đơn tối thiểu để áp dụng |
| `maxUses` | Int? | Giới hạn số lần dùng |
| `usedCount` | Int | Số lần đã dùng |
| `applicableCountries` | String[] | Mảng country codes (rỗng = tất cả) |
| `expiresAt` | DateTime? | Ngày hết hạn |

**Soft delete:** `deletedAt`, `deletedBy`

---

### 18. `order_coupons`
**Mục đích:** Quan hệ nhiều-nhiều giữa đơn hàng và coupon đã dùng.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `orderId` | UUID | FK → orders |
| `couponId` | UUID | FK → coupons |
| `discountApplied` | Decimal(12,4) | Số tiền đã giảm thực tế |

---

### 19. `cart_items`
**Mục đích:** Giỏ hàng của user đã đăng nhập (lưu server-side).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `userId` | UUID | FK → users |
| `productId` | UUID | FK → products |
| `variantId` | UUID? | FK → product_variants |
| `quantity` | Int | Số lượng |

**Constraint:** UNIQUE(`userId`, `productId`, `variantId`) — không trùng item

---

## Nhóm 5 — Shipping

### 20. `shipping_methods`
**Mục đích:** Các phương thức vận chuyển (GHN, GHTK, DHL...).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `name` | String | Tên hiển thị: "Giao hàng nhanh" |
| `provider` | String? | Đơn vị vận chuyển: GHN, GHTK, DHL |
| `isActive` | Boolean | Đang hoạt động |

**Soft delete:** `deletedAt`, `deletedBy`

---

## Nhóm 6 — Roles & Permissions

### 21. `roles`
**Mục đích:** Định nghĩa các vai trò trong hệ thống.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `name` | String UNIQUE | Mã vai trò: SUPER_ADMIN, ADMIN, WAREHOUSE... |
| `displayName` | String | Tên hiển thị: "Quản trị viên" |
| `isSystem` | Boolean | Role hệ thống — không được xóa |

**Soft delete:** `deletedAt`, `deletedBy`

---

### 22. `permissions`
**Mục đích:** Danh sách quyền hạn chi tiết theo cặp `resource:action`.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `resource` | String | Tài nguyên: `products`, `orders`, `users`... |
| `action` | String | Hành động: `create`, `read`, `update`, `delete` |

**Constraint:** UNIQUE(`resource`, `action`)

---

### 23. `role_permissions`
**Mục đích:** Gán quyền cho từng vai trò.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `roleId` | UUID | FK → roles |
| `permissionId` | UUID | FK → permissions |

**Constraint:** UNIQUE(`roleId`, `permissionId`)

---

### 24. `user_roles`
**Mục đích:** Gán vai trò cho từng người dùng (có thể có thời hạn).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `userId` | UUID | FK → users |
| `roleId` | UUID | FK → roles |
| `grantedBy` | UUID? | Ai gán (FK → users) |
| `expiresAt` | DateTime? | Ngày hết hạn (null = vĩnh viễn) |
| `isActive` | Boolean | Đang hiệu lực |
| `revokedAt` | DateTime? | Ngày thu hồi |
| `revokedBy` | UUID? | Ai thu hồi |

**Constraint:** UNIQUE(`userId`, `roleId`)

---

### 25. `admin_accounts`
**Mục đích:** Thông tin bổ sung dành riêng cho nhân viên admin (1-1 với users).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `userId` | UUID UNIQUE | FK → users |
| `employeeCode` | String UNIQUE | Mã nhân viên |
| `department` | String? | Bộ phận |
| `lastLoginAt` | DateTime? | Lần đăng nhập cuối |

**Soft delete:** `deletedAt`, `deletedBy`

---

## Nhóm 7 — Audit & Activity

### 26. `audit_logs`
**Mục đích:** Ghi lại mọi hành động quan trọng của admin — không thể xóa.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `actorId` | UUID? | Ai thực hiện (null = hệ thống) |
| `actorType` | String | `USER`, `SYSTEM`, `WEBHOOK` |
| `action` | String | Hành động: `create`, `update`, `delete`, `login` |
| `resourceType` | String | Loại tài nguyên: `Product`, `Order`... |
| `resourceId` | String? | ID tài nguyên bị tác động |
| `oldValue` | Json? | Giá trị trước khi thay đổi |
| `newValue` | Json? | Giá trị sau khi thay đổi |
| `isSensitive` | Boolean | Chỉ SUPER_ADMIN được xem |

**Index:** `actorId`, `(resourceType, resourceId)`, `createdAt`  
**Lưu ý:** Bảng này chỉ INSERT, không UPDATE hay DELETE.

---

### 27. `login_attempts`
**Mục đích:** Ghi nhận các lần đăng nhập để phát hiện brute force.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `identifier` | String | Email hoặc username đăng nhập |
| `ipAddress` | String | IP của request |
| `success` | Boolean | Đăng nhập thành công hay thất bại |
| `failureReason` | String? | Lý do thất bại |
| `countryCode` | String? | Quốc gia của IP |

**Logic:** Sau 5 lần `success = false` trong 15 phút → khóa tài khoản

---

### 28. `user_activity_logs`
**Mục đích:** Theo dõi hành vi người dùng trên storefront (analytics).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `userId` | UUID? | null nếu là guest |
| `eventType` | String | `page_view`, `product_view`, `add_to_cart`, `purchase` |
| `pageUrl` | String? | URL trang |
| `resourceId` | String? | ID sản phẩm/đơn hàng liên quan |
| `deviceType` | String? | `mobile`, `desktop`, `tablet` |
| `countryCode` | String? | Quốc gia |

---

### 29. `notifications`
**Mục đích:** Thông báo in-app và push notification cho người dùng.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `userId` | UUID | FK → users |
| `type` | String | `order_update`, `stock_alert`, `review_approved`... |
| `channel` | String | `in_app`, `push`, `email` |
| `title` | String | Tiêu đề thông báo |
| `body` | String | Nội dung |
| `isRead` | Boolean | Đã đọc chưa |
| `readAt` | DateTime? | Thời điểm đọc |

---

### 30. `email_logs`
**Mục đích:** Ghi lại mọi email đã gửi (để debug và tránh gửi lại).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `userId` | UUID? | Người nhận (nếu là user) |
| `templateId` | String? | Template email đã dùng |
| `toAddress` | String | Địa chỉ email nhận |
| `subject` | String | Tiêu đề |
| `status` | Enum | pending→sent→failed→bounced |
| `retryCount` | Int | Số lần thử lại |

---

## Nhóm 8 — Inventory & Reviews

### 31. `inventory_transactions`
**Mục đích:** Audit trail đầy đủ mọi thay đổi tồn kho — bất biến, chỉ ghi thêm.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | Sản phẩm bị tác động |
| `variantId` | UUID? | Variant cụ thể (null nếu sản phẩm không có variant) |
| `orderId` | UUID? | Đơn hàng liên quan (nếu là sale/return) |
| `actorId` | UUID? | Người thực hiện |
| `type` | Enum | `purchase`, `sale`, `return`, `adjustment`, `damage` |
| `quantityChange` | Int | Thay đổi (+/-) |
| `quantityBefore` | Int | Tồn kho trước |
| `quantityAfter` | Int | Tồn kho sau |
| `note` | String? | Ghi chú |

**Lưu ý:** Không bao giờ UPDATE hay DELETE bản ghi này. Tồn kho thực tế = `quantityAfter` của bản ghi mới nhất.

---

### 32. `stock_alerts`
**Mục đích:** Cấu hình ngưỡng cảnh báo tồn kho thấp cho từng sản phẩm/variant.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | FK → products |
| `variantId` | UUID? | FK → product_variants |
| `threshold` | Int | Cảnh báo khi tồn kho ≤ giá trị này |
| `isActive` | Boolean | Cảnh báo đang bật |
| `lastAlertedAt` | DateTime? | Lần cảnh báo gần nhất (tránh spam) |

---

### 33. `product_reviews`
**Mục đích:** Đánh giá sản phẩm từ khách hàng (cần moderation trước khi hiển thị).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `productId` | UUID | Sản phẩm được đánh giá |
| `userId` | UUID | Người đánh giá |
| `orderItemId` | UUID? | Gắn với order item cụ thể (verified purchase) |
| `rating` | Int | Điểm từ 1-5 |
| `title` | String? | Tiêu đề đánh giá |
| `body` | String? | Nội dung chi tiết |
| `isVerifiedPurchase` | Boolean | Đã mua thật sự |
| `status` | Enum | `pending` → `approved` hoặc `rejected` |
| `helpfulCount` | Int | Số người thấy đánh giá này hữu ích |
| `reviewedBy` | UUID? | Admin đã duyệt/từ chối |

**Index:** `productId`, `status`

---

## Nhóm 9 — Blog & CMS

### 34. `post_categories`
**Mục đích:** Danh mục bài viết blog (đa cấp giống categories sản phẩm).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `parentId` | UUID? | Danh mục cha (tự tham chiếu) |
| `slug` | String UNIQUE | URL-friendly |
| `name` | String | Tên danh mục blog |
| `sortOrder` | Int | Thứ tự hiển thị |

---

### 35. `posts`
**Mục đích:** Bài viết blog. Nội dung đa ngôn ngữ ở `post_translations`.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `authorId` | UUID | FK → users |
| `categoryId` | UUID | FK → post_categories |
| `slug` | String UNIQUE | URL của bài viết |
| `featuredImageUrl` | String? | Ảnh bìa |
| `status` | Enum | `draft` → `published` → `archived` |
| `isFeatured` | Boolean | Bài viết nổi bật |
| `viewCount` | Int | Số lượt xem |
| `publishedAt` | DateTime? | Ngày xuất bản thực tế |

---

### 36. `post_translations`
**Mục đích:** Nội dung đa ngôn ngữ của bài viết.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `postId` | UUID | FK → posts |
| `locale` | String | `vi` hoặc `en` |
| `title` | String | Tiêu đề bài viết |
| `content` | String? | Nội dung HTML/Markdown |
| `excerpt` | String? | Tóm tắt ngắn |
| `metaTitle` | String? | SEO title |

---

### 37. `pages`
**Mục đích:** Trang CMS tĩnh (About, Privacy Policy, Terms...).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `slug` | String UNIQUE | URL: `about-us`, `privacy-policy` |
| `status` | Enum | `draft` → `published` → `archived` |
| `showInNav` | Boolean | Hiển thị trên navigation |
| `sortOrder` | Int | Thứ tự trong navigation |

---

### 38. `page_translations`
**Mục đích:** Nội dung đa ngôn ngữ của trang CMS.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `pageId` | UUID | FK → pages |
| `locale` | String | `vi` hoặc `en` |
| `title` | String | Tiêu đề trang |
| `content` | String? | Nội dung HTML |
| `metaTitle` | String? | SEO title |

---

### 39. `media_files`
**Mục đích:** Thư viện media — quản lý tất cả file đã upload lên Cloudflare R2.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `uploadedBy` | UUID? | Người upload (null nếu hệ thống tự upload) |
| `filename` | String | Tên file trên R2 (unique, generated) |
| `originalName` | String | Tên gốc của file khi upload |
| `mimeType` | String | `image/jpeg`, `image/png`... |
| `fileSizeBytes` | Int | Kích thước file (bytes) |
| `url` | String | URL gốc trên R2 |
| `cdnUrl` | String? | URL qua Cloudflare CDN (nhanh hơn) |
| `altText` | String? | Alt text mặc định |
| `folder` | String? | Thư mục: `products`, `blog`, `pages` |
| `metadata` | Json? | Dimensions, EXIF data... |

---

## Nhóm 10 — Config

### 40. `system_configs`
**Mục đích:** Key-value store cho cài đặt hệ thống — có thể đọc/ghi động mà không cần restart.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `key` | String UNIQUE | Tên setting: `site.name`, `payment.stripe.mode` |
| `value` | String | Giá trị (serialized) |
| `dataType` | String | `string`, `number`, `boolean`, `json` |
| `group` | String? | Nhóm: `general`, `payment`, `shipping`, `email` |
| `isPublic` | Boolean | Có thể đọc không cần auth |
| `isEncrypted` | Boolean | Giá trị đã mã hóa (cho API keys, secrets) |

**Index:** `group`, `isActive`

---

### 41. `feature_flags`
**Mục đích:** Bật/tắt tính năng không cần deploy lại code.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `key` | String UNIQUE | Tên flag: `enable_reviews`, `enable_cod`, `new_checkout_flow` |
| `isEnabled` | Boolean | Đang bật hay tắt |
| `conditions` | Json? | Điều kiện bật cho nhóm user cụ thể (A/B testing) |
| `description` | String? | Mô tả mục đích của flag |

**Ví dụ sử dụng:** Tắt VNPay trong ngày bảo trì mà không cần deploy code.

---

## Câu hỏi thường gặp

**Q: Tại sao dùng UUID thay vì auto-increment INT?**
> UUID không lộ thông tin (không thể đoán được `id = 101` nghĩa là có 100 bản ghi trước). UUID cũng dễ merge dữ liệu từ nhiều nguồn khi cần.

**Q: Soft delete là gì và tại sao cần?**
> Soft delete đặt `deletedAt = now()` thay vì xóa thật. Ưu điểm: có thể khôi phục, không mất audit trail, không vi phạm FK constraint từ bảng khác.

**Q: Tại sao `order_items` lưu snapshot thay vì FK đến product/price?**
> Nếu dùng FK, khi admin thay đổi giá sản phẩm, giá trong đơn hàng cũ cũng thay đổi theo — điều này vi phạm tính toàn vẹn của đơn hàng. Snapshot đảm bảo giá trong đơn hàng là bất biến.

**Q: Bảng nào không được phép DELETE bản ghi?**
> `audit_logs`, `inventory_transactions`, `login_attempts`, `email_logs` — đây là audit trail. Chỉ được thêm (INSERT), không xóa hay sửa.
