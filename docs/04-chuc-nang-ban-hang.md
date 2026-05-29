# Tài liệu 04 — Chức năng bán hàng

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Chức năng bán hàng (Giỏ hàng → Thanh toán → Đơn hàng) |
| **Phiên bản** | 1.0.0 |
| **Ngày tạo** | 2026-05-30 |
| **Người tạo** | Anh Minh Phạm Vũ |

---

## Mục lục

- [Phần A — Giỏ hàng](#phần-a--giỏ-hàng)
- [Phần B — Mã giảm giá (Coupon)](#phần-b--mã-giảm-giá-coupon)
- [Phần C — Checkout (Đặt hàng)](#phần-c--checkout-đặt-hàng)
- [Phần D — Sau khi đặt hàng](#phần-d--sau-khi-đặt-hàng)
- [Phần E — Quản lý đơn hàng (Admin)](#phần-e--quản-lý-đơn-hàng-admin)
- [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)

---

## Phần A — Giỏ hàng

### Cơ chế lưu trữ

| Trạng thái người dùng | Nơi lưu giỏ hàng |
|----------------------|------------------|
| **Guest** (chưa đăng nhập) | localStorage của browser |
| **Customer** (đã đăng nhập) | Bảng `cart_items` trên server |

**Khi khách đăng nhập:** Giỏ hàng localStorage được merge với giỏ hàng server:
- Nếu sản phẩm đã có trong server cart → cộng dồn số lượng (không vượt `maxQuantity`)
- Nếu chưa có → thêm mới vào server cart
- Sau khi merge, localStorage cart được xóa

### Thêm vào giỏ hàng

```
Khách click "Thêm vào giỏ"
    │
    ├─ Nếu sản phẩm có variants → Bắt buộc chọn variant trước
    ├─ Kiểm tra tồn kho realtime (gọi API)
    │   ├─ Còn hàng → Thêm vào giỏ
    │   └─ Hết hàng → Hiển thị thông báo, disable nút
    ├─ Nếu đã có trong giỏ → Cộng thêm số lượng
    │   └─ Nếu vượt tồn kho → Hiển thị "Đã đạt giới hạn"
    └─ Mở mini cart / drawer xác nhận thêm thành công
```

### Cập nhật giỏ hàng

- **Thay đổi số lượng**: Nhập trực tiếp hoặc dùng nút +/-
  - Số lượng tối thiểu: 1
  - Số lượng tối đa: theo `stockQuantity` của sản phẩm/variant
- **Xóa từng item**: Button xóa bên cạnh mỗi sản phẩm
- **Xóa toàn bộ**: Nút "Xóa giỏ hàng" — yêu cầu xác nhận

### Hiển thị giá theo currency

| Khách hàng | Tiền tệ hiển thị | Nguồn giá |
|------------|------------------|-----------|
| Locale `vi` | VND | `product_prices` với `currency = VND` |
| Locale `en` | USD | `product_prices` với `currency = USD` |
| Tỷ giá | Lấy tại thời điểm checkout | Lưu vào `orders.exchangeRate` |

### Kiểm tra tồn kho realtime

- Mỗi khi mở trang giỏ hàng: gọi API validate lại tồn kho
- Nếu sản phẩm đã hết hàng (sau khi thêm vào giỏ): hiển thị cảnh báo, không cho checkout
- Tồn kho bị **lock** khi bắt đầu checkout (có TTL để tránh deadlock)

---

## Phần B — Mã giảm giá (Coupon)

### Các loại coupon

| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| `percentage` | Giảm theo % tổng đơn | Giảm 20% |
| `fixed` | Giảm số tiền cố định | Giảm 50,000 VND |

### Điều kiện áp dụng

| Điều kiện | Mô tả |
|-----------|-------|
| `minOrderAmount` | Đơn hàng phải đạt tối thiểu số tiền này |
| `maxUses` | Tổng số lần coupon được dùng (để trống = không giới hạn) |
| `applicableCountries` | Danh sách quốc gia được dùng (để trống = tất cả) |
| `expiresAt` | Ngày hết hạn (để trống = không hết hạn) |

### Quy trình kiểm tra coupon

```
Khách nhập mã coupon
    │
    ├─ Tìm coupon theo code (case-insensitive)
    ├─ Kiểm tra isActive = true
    ├─ Kiểm tra chưa hết hạn (expiresAt)
    ├─ Kiểm tra usedCount < maxUses
    ├─ Kiểm tra tổng đơn ≥ minOrderAmount
    ├─ Kiểm tra quốc gia người dùng có trong applicableCountries
    ├─ Tất cả pass → Tính giảm giá, hiển thị cho khách xác nhận
    └─ Có lỗi → Hiển thị lý do cụ thể
```

> **Ghi chú:** `usedCount` chỉ tăng **sau khi thanh toán thành công** — không tăng khi chỉ áp coupon vào giỏ.

---

## Phần C — Checkout (Đặt hàng)

### Bước 1 — Xác nhận giỏ hàng

Khách xem lại toàn bộ sản phẩm trong giỏ:
- Tên sản phẩm, variant, số lượng, đơn giá, thành tiền
- Tổng tiền tạm tính (chưa tính phí ship)
- Ô nhập mã coupon
- Nút "Tiếp tục" → Bước 2

### Bước 2 — Thông tin giao hàng

**Khách đã có địa chỉ lưu sẵn:**
- Hiển thị danh sách địa chỉ từ `user_addresses`
- Địa chỉ mặc định (`isDefault = true`) được chọn sẵn
- Khách chọn địa chỉ khác hoặc thêm mới

**Khách nhập địa chỉ mới:**

| Trường | Bắt buộc |
|--------|----------|
| Họ tên người nhận | ✅ |
| Số điện thoại | ✅ |
| Địa chỉ (số nhà, tên đường) | ✅ |
| Phường/Xã | ✅ |
| Quận/Huyện | ✅ |
| Tỉnh/Thành phố | ✅ |
| Quốc gia | ✅ (mặc định VN) |
| Lưu địa chỉ này | ❌ (checkbox tùy chọn) |

### Bước 3 — Phương thức thanh toán

**Hiển thị theo thị trường:**

| Thị trường (locale) | Phương thức hiển thị |
|--------------------|---------------------|
| Việt Nam (`vi`) | VNPay (ưu tiên), Stripe, COD |
| Quốc tế (`en`) | Stripe (ưu tiên), không có VNPay |

**VNPay:**
- Khách chọn VNPay → Click "Đặt hàng" → Redirect sang cổng VNPay
- Khách hoàn tất thanh toán trên VNPay → Redirect về `VNPAY_RETURN_URL`
- Hệ thống nhận callback IPN → Verify signature → Cập nhật trạng thái

**Stripe:**
- Giao diện Stripe Elements nhúng trực tiếp (không redirect)
- Khách nhập thông tin thẻ → Stripe tokenize an toàn
- Backend gọi `PaymentIntent.confirm` → Xử lý kết quả
- **3D Secure** được xử lý tự động qua Stripe

**COD (Thanh toán khi nhận hàng):**
- Chỉ khả dụng cho đơn giao trong nước
- Không yêu cầu thông tin thanh toán
- `paymentStatus` = `pending` cho đến khi xác nhận giao thành công

### Bước 4 — Xác nhận và đặt hàng

Trang tóm tắt hiển thị:
- Danh sách sản phẩm + giá cuối
- Địa chỉ giao hàng đã chọn
- Phương thức thanh toán
- Bảng phí: subtotal + shipping + discount + tax = **total**

Khi khách click "Xác nhận đặt hàng":
1. API tạo đơn hàng với trạng thái `pending`
2. **Snapshot giá** lưu vào `order_items.productSnapshot` — giá cố định, không thay đổi dù giá sản phẩm thay đổi sau
3. Hệ thống **trừ tồn kho** ngay (`inventory_transaction` loại `sale`)
4. Tạo bản ghi `payment` với status `pending`
5. Chuyển sang cổng thanh toán tương ứng

---

## Phần D — Sau khi đặt hàng

### Vòng đời trạng thái đơn hàng

```
          ┌──────────┐
Tạo đơn → │ pending  │ ──── Khách hủy → cancelled
          └────┬─────┘
               │ Admin xác nhận thanh toán
          ┌────▼─────┐
          │confirmed │
          └────┬─────┘
               │ Kho chuẩn bị hàng
          ┌────▼──────┐
          │processing │
          └────┬──────┘
               │ Giao cho đơn vị vận chuyển
          ┌────▼────┐
          │ shipped │ ──── Có tracking number
          └────┬────┘
               │ Giao thành công
          ┌────▼──────┐
          │ delivered │
          └───────────┘
               │ Khách yêu cầu hoàn tiền (nếu có vấn đề)
          ┌────▼──────┐
          │ refunded  │
          └───────────┘
```

### Trang xác nhận đơn hàng

Sau khi đặt hàng thành công, khách được chuyển đến trang:
- Mã đơn hàng (`ORD-20260530-00001`)
- Tóm tắt sản phẩm đã đặt
- Địa chỉ giao hàng
- Phương thức thanh toán và trạng thái
- Link theo dõi đơn hàng

### Email tự động

| Sự kiện | Nội dung email |
|---------|----------------|
| Đặt hàng thành công | Xác nhận đơn + danh sách sản phẩm + địa chỉ |
| Thanh toán thành công | Xác nhận đã nhận thanh toán |
| Đang xử lý | Thông báo kho đang chuẩn bị |
| Đã giao vận chuyển | Tracking number + link theo dõi |
| Đã giao thành công | Xác nhận giao + link đánh giá sản phẩm |
| Đã hủy | Lý do hủy + hướng dẫn nếu đã thanh toán |
| Hoàn tiền | Xác nhận hoàn tiền + thời gian dự kiến |

### Khách hủy đơn

- **Điều kiện:** Chỉ được hủy khi status = `pending`
- Nếu đã thanh toán → Tự động hoàn tiền
- Tồn kho được **cộng lại** (`inventory_transaction` loại `return`)
- Ghi `cancellationReason` (tùy chọn)

### Yêu cầu hoàn tiền

- Khách gửi yêu cầu sau khi đơn đã giao (`delivered`)
- Thời hạn gửi yêu cầu: trong vòng **7 ngày** sau khi giao
- CSKH xem xét → ADMIN phê duyệt/từ chối
- Hoàn tiền qua cổng thanh toán gốc (Stripe refund / VNPay refund)
- Thời gian hoàn tiền: 3-10 ngày làm việc

---

## Phần E — Quản lý đơn hàng (Admin)

### Danh sách đơn hàng

**Lọc:**
- Trạng thái đơn hàng (pending, confirmed, shipped...)
- Trạng thái thanh toán
- Phương thức thanh toán (vnpay, stripe, cod)
- Khoảng thời gian đặt hàng
- Tên khách, email, mã đơn
- Quốc gia giao hàng

**Hiển thị nhanh:**
- Mã đơn, tên khách, tổng tiền, trạng thái, ngày đặt
- Màu sắc theo trạng thái để nhận biết nhanh
- Export danh sách ra Excel

### Chi tiết đơn hàng

Trang chi tiết bao gồm:
- **Thông tin đơn hàng:** Mã, ngày, trạng thái, timeline cập nhật
- **Sản phẩm:** Danh sách items với ảnh, tên, variant, số lượng, giá
- **Thanh toán:** Phương thức, mã giao dịch, trạng thái
- **Giao hàng:** Địa chỉ, phương thức vận chuyển, tracking
- **Ghi chú nội bộ:** Chỉ admin thấy, không gửi cho khách
- **Lịch sử thao tác:** Ai làm gì, lúc nào (từ audit log)

### Cập nhật trạng thái

- Admin chọn trạng thái mới từ dropdown
- Nhập tracking number khi chuyển sang `shipped`
- Hệ thống tự gửi email thông báo cho khách
- Ghi audit log hành động cập nhật

### Hoàn tiền (Refund)

| Loại hoàn tiền | Mô tả |
|----------------|-------|
| Hoàn toàn phần | Hoàn 100% giá trị đơn hàng |
| Hoàn một phần | Nhập số tiền cụ thể cần hoàn |

**Quy trình:**
1. Admin chọn "Tạo hoàn tiền" trong trang chi tiết đơn
2. Chọn loại và nhập lý do
3. Gọi API hoàn tiền tương ứng (Stripe refund / VNPay refund)
4. Cập nhật `paymentStatus = refunded`
5. Ghi audit log
6. Gửi email xác nhận cho khách

---

## Câu hỏi thường gặp

**Q: Nếu thanh toán VNPay thành công nhưng IPN callback bị thất lạc thì sao?**
> VNPay có cơ chế gửi lại IPN. Backend cũng có thể **chủ động query** trạng thái giao dịch từ VNPay API (Transaction Query) để reconcile. Cần implement cron job check định kỳ cho các đơn `pending` quá 30 phút.

**Q: Tồn kho bị trừ ở bước nào? Nếu thanh toán thất bại thì sao?**
> Tồn kho trừ **ngay khi tạo đơn** (bước 4 checkout) để tránh overselling. Nếu thanh toán thất bại trong 30 phút, hệ thống tự động **cộng lại tồn kho** và hủy đơn.

**Q: Khách mua cùng lúc nhiều người, tồn kho chỉ còn 1 thì ai được mua?**
> Ai gọi API tạo đơn thành công trước thì được. Backend dùng database transaction để đảm bảo race condition không xảy ra (check và trừ tồn kho trong cùng 1 transaction).

**Q: Mã đơn hàng được tạo như thế nào?**
> Format: `ORD-YYYYMMDD-XXXXX`. Ví dụ: `ORD-20260530-00042`. Số XXXXX là sequential counter cho ngày đó, reset về 00001 mỗi ngày.

**Q: Admin có thể sửa nội dung đơn hàng sau khi đặt không?**
> **Không.** Đơn hàng là bất biến sau khi tạo. Nếu cần sửa (sai địa chỉ giao hàng), admin chỉ được cập nhật `notes` nội bộ, không sửa sản phẩm hay giá. Nếu sai nghiêm trọng thì hủy đơn và tạo đơn mới.
