# Business Rules — My Shop Online

Các quy tắc nghiệp vụ bắt buộc enforce tại tầng **service**. Áp dụng khi implement bất kỳ module nào.

---

## Sản phẩm (BR-P)

**BR-P01 — SKU unique toàn hệ thống (kể cả soft-deleted)**
- Khi tạo/sửa SKU phải check cả records có `deletedAt IS NOT NULL`.
- Lỗi: `409` / code `SKU_CONFLICT`.

**BR-P02 — Phải có ≥1 ảnh trước khi active**
- Không thể set `isActive = true` nếu `product_images` chưa có bản ghi nào.
- Lỗi: `400` / code `PRODUCT_NO_IMAGE`.

**BR-P03 — Giá phải > 0**
- `basePrice > 0`, `unitPrice > 0` — validate Zod `.positive()` + DB check constraint.

**BR-P04 — Slug unique và ổn định**
- Auto-generate từ tên. Nếu trùng → append `-1`, `-2`...
- Check unique cả soft-deleted. Cảnh báo nếu thay slug sản phẩm đang active.

**BR-P05 — Chỉ 1 ảnh primary mỗi sản phẩm**
- Set ảnh mới là primary → unset tất cả ảnh primary cũ trong cùng `$transaction`.

**BR-P06 — Soft-deleted KHÔNG hiển thị ở bất kỳ đâu**
- Mọi Prisma query trên `Product` phải có `where: { deletedAt: null }`.

**BR-P07 — Storefront chỉ hiển thị sản phẩm Active**
- Public/Customer: `where: { isActive: true, deletedAt: null }`.
- Admin: `where: { deletedAt: null }` (xem được mọi trạng thái).

---

## Tồn kho (BR-I)

**BR-I01 — Tồn kho không được âm**
- Trước khi trừ: kiểm tra `currentStock >= requestedQty`.
- Ngoại lệ: `attributes.backorder = true`.
- Lỗi: `400` / code `INSUFFICIENT_STOCK`.

**BR-I02 — Mọi thay đổi tồn kho PHẢI tạo inventory_transaction**
- Không bao giờ update `stockQuantity` mà không INSERT `inventory_transaction` cùng lúc.
- Bắt buộc ghi: `quantityBefore`, `quantityAfter`, `actorId`, `type`.
- Luôn dùng `prisma.$transaction([...])`.

**BR-I03 — inventory_transaction là bất biến**
- Không expose UPDATE/DELETE endpoint cho bảng này.
- Sửa lỗi bằng giao dịch `adjustment` đối nghịch.

**BR-I04 — Cảnh báo khi stock ≤ threshold**
- Sau mỗi lần trừ stock, kiểm tra `StockAlert`. Nếu đạt ngưỡng → tạo `Notification` type `stock_alert` cho ADMIN/WAREHOUSE.

---

## Đơn hàng (BR-O)

**BR-O01 — Giá tính server-side, không tin client**
- Lấy giá từ DB tại thời điểm tạo đơn, ghi vào `order_items.unitPrice`.

**BR-O02 — Chỉ hủy đơn khi hợp lệ**
- Customer: chỉ hủy `pending`.
- Admin/Support: hủy được `pending` và `confirmed`.
- Khi hủy: hoàn `stockQuantity` + ghi `inventory_transaction` type `return`.

**BR-O03 — Chuyển trạng thái đúng chiều**
```
pending → confirmed → processing → shipped → delivered
pending → cancelled (customer)
confirmed → cancelled (admin/support)
```
Không nhảy cóc. Validate trong service trước khi update.

**BR-O04 — Không xóa đơn hàng**
- Chỉ cancel, không bao giờ DELETE.

---

## Thanh toán (BR-PAY)

**BR-PAY01 — Stripe: luôn verify webhook signature**
- Gọi `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)`.
- Route này phải nhận raw body (mount TRƯỚC `express.json()`).

**BR-PAY02 — VNPay: luôn verify HMAC hash**
- Kiểm tra `vnp_SecureHash` trước khi xử lý callback.

**BR-PAY03 — Idempotent payment**
- Dùng `paymentIntentId` / `vnp_TxnRef` làm idempotency key. Nếu đã xử lý thì bỏ qua.

---

## Người dùng & Bảo mật (BR-U)

**BR-U01** — bcrypt cost ≥ 12.

**BR-U02 — Refresh token rotation**
- Mỗi lần dùng refresh token → vô hiệu token cũ trong Redis.

**BR-U03 — Ownership check**
- Customer chỉ đọc/sửa resource của chính mình. Service phải check `resource.userId === req.user.id`.

**BR-U04 — Không trả `passwordHash`**
- Luôn dùng Prisma `select` để loại trừ `passwordHash` trong mọi query User.

**BR-U05 — Review chỉ cho đơn đã giao**
- Validate `order.status === 'delivered'` và `order.userId === reviewer.id`.

---

## Coupon (BR-C)

**BR-C01 — Validate coupon theo thứ tự**
1. Tồn tại và `isActive = true`
2. Trong thời hạn (`startDate ≤ now ≤ endDate`)
3. Chưa đạt `usageLimit`
4. User chưa dùng quá `perUserLimit`
5. Giá trị đơn ≥ `minOrderAmount`

**BR-C02 — Tăng usageCount atomic**
- Dùng `prisma.$transaction` để tránh race condition.
