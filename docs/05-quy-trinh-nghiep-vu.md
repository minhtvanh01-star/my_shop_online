# Tài liệu 05 — Quy trình nghiệp vụ

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Quy trình vận hành thực tế |
| **Phiên bản** | 1.0.0 |
| **Ngày tạo** | 2026-05-30 |
| **Người tạo** | Anh Minh Phạm Vũ |

---

## Mục lục

1. [Quy trình 1 — Thêm sản phẩm mới](#quy-trình-1--thêm-sản-phẩm-mới)
2. [Quy trình 2 — Xử lý đơn hàng mới](#quy-trình-2--xử-lý-đơn-hàng-mới)
3. [Quy trình 3 — Hoàn trả và hoàn tiền](#quy-trình-3--hoàn-trả-và-hoàn-tiền)
4. [Quy trình 4 — Nhập kho và cập nhật tồn kho](#quy-trình-4--nhập-kho-và-cập-nhật-tồn-kho)
5. [Quy trình 5 — Xử lý đơn thanh toán thất bại](#quy-trình-5--xử-lý-đơn-thanh-toán-thất-bại)
6. [Quy trình 6 — Tạo và quản lý coupon](#quy-trình-6--tạo-và-quản-lý-coupon)
7. [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)

---

## Quy trình 1 — Thêm sản phẩm mới

**Người thực hiện:** ADMIN  
**Thời gian trung bình:** 15-30 phút/sản phẩm  
**Điều kiện tiên quyết:** Đã có ít nhất 1 danh mục trong hệ thống

```
[BẮT ĐẦU]
    │
    ▼
[Kiểm tra danh mục]
    ├── Danh mục chưa có → Tạo mới danh mục trước (ADMIN)
    └── Danh mục đã có → Tiếp tục
    │
    ▼
[Tạo sản phẩm mới] → Vào Admin Panel → Sản phẩm → Thêm mới
    │
    ▼
[Nhập thông tin cơ bản]
    ├── Tên tiếng Việt + tiếng Anh
    ├── Chọn danh mục
    ├── Nhập SKU (hệ thống kiểm tra unique)
    │   └── SKU trùng → Báo lỗi, nhập lại
    └── Gán tags
    │
    ▼
[Upload ảnh sản phẩm]
    ├── Upload ít nhất 1 ảnh
    ├── Chọn ảnh đại diện (isPrimary)
    └── Sắp xếp thứ tự ảnh
    │
    ▼
[Nhập mô tả]
    ├── Mô tả ngắn (tiếng Việt + tiếng Anh)
    └── Mô tả đầy đủ rich text
    │
    ▼
[Thiết lập giá và tồn kho]
    ├── Giá VND
    ├── Giá USD (nếu bán quốc tế)
    ├── Giá so sánh (giá cũ, tùy chọn)
    ├── Số lượng tồn kho ban đầu
    └── Ngưỡng cảnh báo hết hàng
    │
    ▼
[Thêm variants? (tùy chọn)]
    ├── Không có variant → Bỏ qua bước này
    └── Có variant (Size, Màu, ...) → Tạo từng variant
         ├── Nhập optionName + optionValue
         ├── SKU variant (unique)
         ├── Giá điều chỉnh (modifier)
         ├── Tồn kho riêng
         └── Ảnh riêng (tùy chọn)
    │
    ▼
[Điền thông tin SEO]
    ├── Slug tự động tạo → Có thể chỉnh sửa
    ├── Meta title (≤60 ký tự)
    └── Meta description (≤160 ký tự)
    │
    ▼
[Lưu bản nháp (Draft)]
    │
    ▼
[Xem trước sản phẩm (Preview)]
    ├── Hiển thị đúng → Chuyển bước tiếp
    └── Cần sửa → Quay lại chỉnh sửa
    │
    ▼
[Chọn thị trường bán]
    ├── Chỉ Việt Nam
    ├── Chỉ quốc tế
    └── Cả hai
    │
    ▼
[Đăng bán]
    ├── Đăng ngay → isActive = true
    └── Đặt lịch → Nhập ngày/giờ
    │
    ▼
[KẾT THÚC] — Sản phẩm hiển thị trên storefront
```

**Kiểm tra chất lượng trước khi đăng:**
- [ ] Có ít nhất 1 ảnh chất lượng tốt
- [ ] Tên đầy đủ cả tiếng Việt và tiếng Anh
- [ ] Giá hợp lệ (> 0)
- [ ] Tồn kho được nhập
- [ ] Meta title và description đã điền
- [ ] Slug không trùng với sản phẩm khác

---

## Quy trình 2 — Xử lý đơn hàng mới

**Người thực hiện:** ADMIN → WAREHOUSE  
**SLA:** Xác nhận đơn trong 2 giờ, giao hàng trong 1-3 ngày làm việc  
**Trigger:** Khách đặt hàng thành công → Email thông báo gửi cho ADMIN

```
[KHÁCH ĐẶT HÀNG]
    │ Đơn hàng tạo với status: pending
    │ Payment: pending
    ▼
[KIỂM TRA THANH TOÁN] (hệ thống tự động)
    ├── VNPay/Stripe webhook callback
    │   ├── Thành công → payment.status = completed
    │   │                order.status = pending (chờ Admin xác nhận)
    │   └── Thất bại → payment.status = failed
    │                  order.status giữ nguyên pending
    │                  Thông báo cho khách, cộng lại tồn kho
    └── COD → payment.status = pending (không cần xác nhận)
    │
    ▼
[ADMIN XÁC NHẬN ĐƠN]
    ├── Kiểm tra thông tin đơn hàng
    ├── Kiểm tra tồn kho còn đủ
    │   └── Thiếu hàng → Liên hệ khách để điều chỉnh hoặc hủy
    ├── Nhập ghi chú nội bộ (nếu cần)
    └── Cập nhật: order.status = confirmed
         → Gửi email "Đã xác nhận đơn hàng" cho khách
    │
    ▼
[WAREHOUSE CHUẨN BỊ HÀNG]
    ├── Xem danh sách đơn hàng status = confirmed
    ├── In phiếu đóng gói (picking list)
    ├── Lấy hàng từ kho, đóng gói
    └── Cập nhật: order.status = processing
    │
    ▼
[WAREHOUSE GIAO VẬN CHUYỂN]
    ├── Bàn giao cho đơn vị vận chuyển
    ├── Nhập tracking number vào hệ thống
    └── Cập nhật: order.status = shipped
         → Gửi email "Đơn hàng đang giao" kèm tracking cho khách
    │
    ▼
[KHÁCH NHẬN HÀNG]
    ├── Đơn vị vận chuyển xác nhận giao thành công
    ├── Hoặc Admin cập nhật thủ công sau 3-5 ngày
    └── Cập nhật: order.status = delivered
         → Gửi email "Giao hàng thành công + mời đánh giá"
    │
    ▼
[KẾT THÚC]
```

---

## Quy trình 3 — Hoàn trả và hoàn tiền

**Người thực hiện:** CUSTOMER → CSKH → ADMIN  
**Điều kiện:** Trong vòng 7 ngày sau khi nhận hàng

```
[KHÁCH YÊU CẦU HOÀN TRẢ]
    ├── Vào trang đơn hàng → "Yêu cầu hoàn trả"
    ├── Chọn lý do: hàng lỗi / không đúng mô tả / đổi ý
    └── Mô tả chi tiết + đính kèm ảnh (nếu hàng lỗi)
    │
    ▼
[CSKH TIẾP NHẬN VÀ XEM XÉT]
    ├── Xem thông tin đơn và yêu cầu của khách
    ├── Kiểm tra điều kiện:
    │   ├── Trong thời hạn 7 ngày? ✓/✗
    │   ├── Sản phẩm thuộc danh mục được hoàn? ✓/✗
    │   └── Lý do hợp lệ? ✓/✗
    ├── Điều kiện không đáp ứng → Từ chối + giải thích cho khách
    └── Điều kiện đáp ứng → Tạo yêu cầu hoàn tiền → Chờ ADMIN
    │
    ▼
[ADMIN PHÊ DUYỆT]
    ├── Xem xét yêu cầu từ CSKH
    ├── Từ chối → Ghi lý do → Thông báo CSKH → Liên hệ khách
    └── Phê duyệt → Tiến hành hoàn tiền
    │
    ▼
[THỰC HIỆN HOÀN TIỀN]
    ├── Stripe refund:
    │   └── Gọi Stripe API refund
    │       → Tiền về thẻ trong 5-10 ngày làm việc
    └── VNPay refund:
        └── Gọi VNPay Refund API
            → Tiền về tài khoản ngân hàng trong 3-7 ngày
    │
    ▼
[CẬP NHẬT HỆ THỐNG]
    ├── order.status = refunded
    ├── payment.status = refunded
    ├── Cộng lại tồn kho: inventory_transaction (type: return)
    └── Ghi audit log
    │
    ▼
[THÔNG BÁO KHÁCH HÀNG]
    └── Gửi email xác nhận hoàn tiền + thời gian dự kiến nhận
    │
    ▼
[KẾT THÚC]
```

---

## Quy trình 4 — Nhập kho và cập nhật tồn kho

**Người thực hiện:** WAREHOUSE  
**Frequency:** Khi nhận hàng từ nhà cung cấp hoặc điều chỉnh định kỳ

```
[NHẬN HÀNG TỪ NHÀ CUNG CẤP]
    │
    ▼
[WAREHOUSE ĐĂNG NHẬP HỆ THỐNG]
    │
    ▼
[VÀO MODULE QUẢN LÝ TỒN KHO]
    │
    ▼
[TÌM SẢN PHẨM / VARIANT CẦN NHẬP]
    ├── Tìm kiếm theo tên hoặc SKU
    └── Chọn đúng variant (nếu có)
    │
    ▼
[NHẬP SỐ LƯỢNG]
    ├── Chọn loại giao dịch:
    │   ├── purchase  → Nhập hàng từ nhà cung cấp
    │   ├── return    → Hàng trả lại từ khách
    │   ├── adjustment → Điều chỉnh sau kiểm kê
    │   └── damage    → Ghi nhận hàng hỏng
    ├── Nhập số lượng
    │   ├── purchase/return/adjustment (+) → Số dương
    │   └── damage/sale (-) → Số âm
    └── Nhập ghi chú (lô hàng, ngày nhập, ...)
    │
    ▼
[HỆ THỐNG XỬ LÝ]
    ├── Tính toán: quantityAfter = quantityBefore + quantityChange
    ├── Kiểm tra: quantityAfter ≥ 0?
    │   └── Âm → Báo lỗi, không cho lưu
    ├── Cập nhật: product.stockQuantity hoặc variant.stockQuantity
    ├── Ghi bản ghi inventory_transaction với đầy đủ thông tin
    │   └── actorId = người thực hiện (WAREHOUSE user)
    └── Kiểm tra stock alert: stockQuantity ≤ threshold?
         └── Có → Tạo Notification, gửi email cảnh báo cho ADMIN
    │
    ▼
[XÁC NHẬN]
    └── Hiển thị tồn kho mới, lịch sử giao dịch
    │
    ▼
[KẾT THÚC]
```

**Kiểm kê định kỳ (hàng tháng):**
1. WAREHOUSE xuất danh sách tồn kho hiện tại từ hệ thống
2. Đếm thực tế từng mặt hàng
3. Nhập lệnh điều chỉnh (`adjustment`) cho các mặt hàng chênh lệch
4. Ghi chú nguyên nhân chênh lệch (nếu biết)

---

## Quy trình 5 — Xử lý đơn thanh toán thất bại

**Người thực hiện:** Hệ thống tự động + ADMIN (nếu cần)  
**Trigger:** Webhook báo payment failed hoặc timeout sau 30 phút

```
[THANH TOÁN THẤT BẠI]
    │ (Stripe webhook hoặc VNPay callback)
    ▼
[HỆ THỐNG TỰ ĐỘNG]
    ├── Cập nhật payment.status = failed
    ├── Cộng lại tồn kho (inventory_transaction: return)
    ├── Gửi email cho khách: "Thanh toán không thành công"
    │   └── Kèm link thử lại hoặc chọn phương thức khác
    └── Giữ nguyên đơn hàng ở trạng thái pending trong 24 giờ
    │
    ▼
[KHÁCH CÓ THỬ LẠI?]
    ├── Có → Khách chọn lại phương thức thanh toán
    │        → Tạo payment record mới
    │        → Lặp lại luồng thanh toán
    └── Không (sau 24 giờ) → Hệ thống tự hủy đơn
                              → order.status = cancelled
                              → Gửi email thông báo hủy
    │
    ▼
[ADMIN XEM XÉT THỦ CÔNG (nếu cần)]
    └── Trường hợp đặc biệt (VNPay báo thành công nhưng hệ thống chưa nhận)
        └── Admin query thủ công → Reconcile
    │
    ▼
[KẾT THÚC]
```

---

## Quy trình 6 — Tạo và quản lý coupon

**Người thực hiện:** ADMIN  
**Mục đích:** Khuyến mãi, tri ân khách hàng, chiến dịch marketing

```
[LÊN KẾ HOẠCH COUPON]
    ├── Xác định mục tiêu: tăng đơn / xả hàng / khách mới
    ├── Chọn loại: percentage (%) hoặc fixed (số tiền cố định)
    └── Xác định điều kiện và giới hạn
    │
    ▼
[TẠO COUPON TRONG HỆ THỐNG]
    ├── Nhập mã code (VD: SUMMER20, NEWUSER50K)
    │   └── Code phải unique, khuyến nghị dùng chữ hoa
    ├── Chọn loại và giá trị
    ├── Đặt điều kiện:
    │   ├── Đơn tối thiểu (minOrderAmount)
    │   ├── Số lần dùng tối đa (maxUses)
    │   ├── Quốc gia áp dụng (nếu giới hạn)
    │   └── Ngày hết hạn
    └── isActive = true
    │
    ▼
[PHÂN PHỐI CHO KHÁCH]
    ├── Email marketing campaign
    ├── Đăng lên social media
    ├── Gửi trực tiếp cho khách VIP
    └── Hiển thị banner trên website
    │
    ▼
[THEO DÕI HIỆU QUẢ]
    ├── Xem usedCount so với maxUses
    ├── Xem tổng giá trị discount đã cấp
    └── Phân tích đơn hàng từ coupon này
    │
    ▼
[KẾT THÚC / TẮT COUPON]
    ├── Hết hạn tự động (expiresAt)
    ├── Hết lượt (usedCount = maxUses)
    └── Admin tắt thủ công (isActive = false)
```

---

## Câu hỏi thường gặp

**Q: WAREHOUSE nhập nhầm tồn kho thì sửa được không?**
> Bản ghi `inventory_transaction` là **bất biến** (không sửa/xóa) — đây là audit trail. Để sửa, WAREHOUSE tạo thêm giao dịch điều chỉnh (`adjustment`) với số âm hoặc dương để bù lại sai lệch. Ghi rõ lý do trong field `note`.

**Q: Đơn hàng đang giao (shipped) thì hủy được không?**
> Về mặt hệ thống: không cho phép hủy khi status ≠ pending. Trên thực tế: phải liên hệ đơn vị vận chuyển để chặn giao. ADMIN cập nhật thủ công sau khi xác nhận với vận chuyển, rồi xử lý hoàn tiền.

**Q: Coupon được áp dụng bao nhiêu lần cho một tài khoản?**
> Hiện tại hệ thống giới hạn theo `maxUses` tổng, không giới hạn per-user. Nếu muốn giới hạn per-user, cần kiểm tra bảng `order_coupons` xem tài khoản đó đã dùng code này chưa (logic thêm sau).

**Q: Nhân viên CSKH có thể tự chuyển đơn sang shipped không?**
> Không. CSKH chỉ được cập nhật trạng thái trong phạm vi giới hạn. Chuyển sang `shipped` yêu cầu quyền WAREHOUSE hoặc ADMIN, vì cần nhập tracking number và xác nhận đã bàn giao vật lý.

**Q: Quy trình nào cần audit log?**
> Tất cả: tạo/sửa/xóa sản phẩm, thay đổi giá, mọi cập nhật trạng thái đơn hàng, hoàn tiền, gán/thu hồi quyền, thay đổi cấu hình hệ thống. Ghi log là **bắt buộc**, không phải tùy chọn.
