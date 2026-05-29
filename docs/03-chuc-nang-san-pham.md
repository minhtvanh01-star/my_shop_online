# Tài liệu 03 — Chức năng quản lý sản phẩm

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Chức năng quản lý sản phẩm |
| **Phiên bản** | 1.0.0 |
| **Ngày tạo** | 2026-05-30 |
| **Người tạo** | Anh Minh Phạm Vũ |

---

## Mục lục

- [Phần A — Tạo sản phẩm](#phần-a--tạo-sản-phẩm)
- [Phần B — Quản lý sản phẩm (Admin)](#phần-b--quản-lý-sản-phẩm-admin)
- [Phần C — Đăng bán sản phẩm](#phần-c--đăng-bán-sản-phẩm)
- [Phần D — Tìm kiếm và lọc (phía khách hàng)](#phần-d--tìm-kiếm-và-lọc-phía-khách-hàng)
- [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)

---

## Phần A — Tạo sản phẩm

Quy trình tạo sản phẩm mới trong Admin Panel gồm 7 bước thực hiện tuần tự.

---

### Bước 1 — Nhập thông tin cơ bản

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên (tiếng Việt) | ✅ | Tên hiển thị cho khách VN, tối đa 255 ký tự |
| Tên (tiếng Anh) | ✅ | Tên hiển thị cho khách quốc tế |
| Mô tả ngắn (vi) | ❌ | Tóm tắt 1-2 câu, hiển thị trong danh sách |
| Mô tả ngắn (en) | ❌ | Bản tiếng Anh của mô tả ngắn |
| Mô tả đầy đủ (vi) | ❌ | Hỗ trợ rich text (HTML) — chi tiết sản phẩm |
| Mô tả đầy đủ (en) | ❌ | Bản tiếng Anh |
| Danh mục | ✅ | Chọn từ cây danh mục đã có |
| SKU | ✅ | Mã sản phẩm, **phải unique toàn hệ thống** |
| Tags | ❌ | Gán nhiều tag, hỗ trợ tạo mới inline |

> **Lưu ý:** Tên sản phẩm và mô tả được lưu trong bảng `product_translations` theo locale (`vi`, `en`). Bảng `products` chỉ lưu thông tin kỹ thuật.

---

### Bước 2 — Thiết lập giá

#### Giá cơ sở

| Trường | Mô tả |
|--------|-------|
| Giá gốc (VND) | Giá bán mặc định cho thị trường Việt Nam |
| Giá so sánh (VND) | Giá cũ để gạch ngang — chỉ hiển thị khi lớn hơn giá gốc |

#### Giá theo thị trường quốc tế

Lưu trong bảng `product_prices` theo cặp `(productId, currency, countryCode)`:

| Thị trường | Tiền tệ | Ví dụ |
|------------|---------|-------|
| Việt Nam | VND | 250,000 VND |
| Toàn cầu (mặc định) | USD | 10.99 USD |
| EU (tùy chọn) | EUR | 9.99 EUR |

> ⚠️ **Quan trọng:** Tất cả giá tiền phải dùng kiểu `Decimal(12,4)` — **không dùng float** để tránh lỗi làm tròn tiền tệ.

#### Giá theo variant

Mỗi variant có trường `priceModifier` — điều chỉnh cộng/trừ so với giá gốc:
- `priceModifier = 0` → giá bằng giá sản phẩm
- `priceModifier = 50000` → giá = giá gốc + 50,000 VND
- `priceModifier = -20000` → giá = giá gốc - 20,000 VND

---

### Bước 3 — Quản lý tồn kho

| Trường | Mô tả |
|--------|-------|
| Số lượng ban đầu | Nhập số lượng khi tạo sản phẩm — ghi 1 bản ghi `inventory_transaction` loại `purchase` |
| Ngưỡng cảnh báo | Khi `stockQuantity ≤ threshold` → gửi thông báo, bật cờ `StockAlert` |
| Cho phép backorder | Nếu bật: khách vẫn đặt được khi hết hàng (hữu ích cho hàng đặt trước) |

> **Quy tắc:** Tồn kho không được âm trừ khi backorder được bật. Mọi thay đổi tồn kho đều phải có bản ghi trong `inventory_transactions`.

---

### Bước 4 — Variants (biến thể)

Variants dùng khi sản phẩm có nhiều phiên bản (size, màu sắc, dung lượng...).

**Cách hoạt động:**
1. Định nghĩa các **thuộc tính** và **giá trị**: Size: `S`, `M`, `L`, `XL` hoặc Màu: `Đỏ`, `Xanh`, `Đen`
2. Hệ thống tạo các variant dựa trên tổ hợp thuộc tính
3. Mỗi variant có:
   - **SKU riêng** (bắt buộc, unique)
   - **Giá điều chỉnh** (có thể +/-)
   - **Tồn kho riêng**
   - **Ảnh riêng** (tùy chọn)

**Ví dụ:**
```
Sản phẩm: Áo thun cơ bản
├── Variant: Size S - Màu Đỏ  | SKU: AT-S-RED  | +0 VND   | Stock: 50
├── Variant: Size M - Màu Đỏ  | SKU: AT-M-RED  | +0 VND   | Stock: 80
├── Variant: Size L - Màu Xanh | SKU: AT-L-BLUE | +10,000 VND | Stock: 30
└── Variant: Size XL - Màu Đen | SKU: AT-XL-BLK | +20,000 VND | Stock: 20
```

> **Lưu ý:** Khi sản phẩm không có variant, giá và tồn kho lấy trực tiếp từ bảng `products`.

---

### Bước 5 — Upload ảnh sản phẩm

| Quy định | Giá trị |
|----------|---------|
| Định dạng cho phép | JPG, JPEG, PNG, WebP |
| Dung lượng tối đa | 10MB/ảnh |
| Số lượng ảnh tối đa | 20 ảnh/sản phẩm |
| Kích thước khuyến nghị | 800×800px trở lên (tỷ lệ 1:1) |

**Quy trình upload:**
1. Chọn file → Frontend gửi lên `POST /api/v1/media/upload`
2. Backend resize (sharp) → upload lên Cloudflare R2
3. Trả về URL → lưu vào bảng `product_images`
4. Admin chọn **ảnh đại diện** (`isPrimary = true`) — chỉ 1 ảnh/sản phẩm
5. Admin kéo thả để **sắp xếp thứ tự** (`sortOrder`)

> ⚠️ **Luật nghiệp vụ:** Sản phẩm **phải có ít nhất 1 ảnh** trước khi có thể chuyển trạng thái sang `Active`.

---

### Bước 6 — SEO

| Trường | Mô tả |
|--------|-------|
| Meta Title | Tiêu đề hiển thị trên Google (60 ký tự) — lưu trong `product_translations` |
| Meta Description | Mô tả ngắn Google (160 ký tự) |
| Slug | URL-friendly, **tự động tạo từ tên sản phẩm**, có thể chỉnh sửa thủ công |
| Canonical URL | Tự động từ slug |

**Quy tắc slug:**
- Tự động slug hóa từ tên (vi): `Áo Thun Cơ Bản` → `ao-thun-co-ban`
- Bỏ dấu tiếng Việt, chuyển thành chữ thường, thay khoảng trắng bằng dấu `-`
- Slug phải **unique** trong toàn hệ thống — tự động thêm hậu tố `-1`, `-2`... nếu trùng
- Slug không thể thay đổi sau khi sản phẩm đã được index (ảnh hưởng SEO)

---

### Bước 7 — Trạng thái sản phẩm

| Trạng thái | Mô tả | Hiển thị storefront |
|------------|-------|---------------------|
| **Draft** (Nháp) | Đang tạo, chưa hoàn thiện | ❌ Ẩn |
| **Active** (Đang bán) | Đã kiểm tra, sẵn sàng bán | ✅ Hiển thị |
| **Hidden** (Đã ẩn) | Tạm ẩn theo ý admin | ❌ Ẩn |
| **Out of Stock** | Tự động khi `stockQuantity = 0` | ✅ Hiển thị (gắn nhãn "Hết hàng") |

> **Chuyển trạng thái:** Admin phải đảm bảo sản phẩm có ảnh và giá hợp lệ trước khi Active. Hệ thống tự validate và hiển thị lỗi nếu thiếu điều kiện.

---

## Phần B — Quản lý sản phẩm (Admin)

### Danh sách sản phẩm

Màn hình danh sách hỗ trợ:
- **Tìm kiếm** theo tên, SKU, mô tả (full-text search)
- **Lọc** theo: danh mục, trạng thái, khoảng giá, có/không có variant
- **Sắp xếp** theo: tên, giá, ngày tạo, tồn kho, lượt xem
- **Pagination**: 20/50/100 sản phẩm mỗi trang

### Chỉnh sửa sản phẩm

Quy trình tương tự tạo mới. Hệ thống ghi lại:
- Người sửa (`updatedBy`)
- Thời gian sửa (`updatedAt`)
- Audit log ghi nội dung thay đổi (giá trị cũ → mới)

### Nhân bản sản phẩm (Duplicate)

Tạo bản sao với:
- Tất cả thông tin (tên, mô tả, ảnh, giá, variants)
- **Trạng thái tự động là Draft** — tránh vô tình đăng bán trùng
- **SKU mới** tự động: thêm hậu tố `-copy`
- **Slug mới** tự động: thêm hậu tố `-copy`

### Xóa mềm (Soft Delete)

- Sản phẩm bị xóa chỉ ẩn khỏi danh sách, không xóa khỏi database
- Field `deletedAt` được set, `deletedBy` ghi lại người xóa
- Xem lại sản phẩm đã xóa qua filter "Thùng rác"
- **Khôi phục**: Admin có thể restore trong vòng 30 ngày
- **Xóa vĩnh viễn**: Chỉ SUPER_ADMIN sau khi đã xóa mềm 30+ ngày

### Xuất / Nhập hàng loạt

**Xuất Excel:**
- Export danh sách với tất cả thông tin (kể cả variants)
- Định dạng .xlsx, có thể mở bằng Excel / Google Sheets

**Nhập từ Excel/CSV:**
- Template cố định — tải mẫu trước khi nhập
- Validate từng dòng trước khi import
- Báo cáo lỗi từng dòng nếu có vấn đề
- Giới hạn 500 sản phẩm/lần import

---

## Phần C — Đăng bán sản phẩm

### Đăng ngay vs. Đặt lịch

| Tùy chọn | Mô tả |
|----------|-------|
| **Đăng ngay** | Chuyển trạng thái sang `Active` lập tức |
| **Đặt lịch** | Nhập ngày giờ cụ thể — hệ thống tự đổi trạng thái khi đến giờ |

> Đặt lịch dùng cron job chạy mỗi phút để kiểm tra và cập nhật.

### Đăng theo thị trường

| Tùy chọn | Mô tả |
|----------|-------|
| Chỉ Việt Nam | Chỉ hiển thị khi locale = `vi`, ẩn với khách quốc tế |
| Chỉ quốc tế | Chỉ hiển thị với locale = `en` |
| Cả hai | Hiển thị với tất cả người dùng |

> Kiểm soát bằng field `attributes` trong bảng `products` (JSON): `{ "markets": ["VN", "GLOBAL"] }`

### Cảnh báo hết hàng

Khi tồn kho chạm ngưỡng cảnh báo (`StockAlert.threshold`):
1. Hệ thống gửi email cho ADMIN và WAREHOUSE
2. Hiển thị badge "Sắp hết hàng" trong Admin Panel
3. Tạo bản ghi `Notification` type = `stock_alert`
4. Không gửi lại cảnh báo trong vòng 24 giờ (`lastAlertedAt`)

---

## Phần D — Tìm kiếm và lọc (phía khách hàng)

### Tìm kiếm full-text

- Tìm theo: tên sản phẩm (vi + en), mô tả, SKU, tags
- Sử dụng PostgreSQL full-text search với `tsvector`
- Hỗ trợ tìm kiếm không dấu (tiếng Việt): `"áo thun"` → cũng tìm ra `"ao thun"`
- Hiển thị kết quả gợi ý (autocomplete) khi gõ ≥ 2 ký tự

### Bộ lọc nâng cao

| Bộ lọc | Mô tả |
|--------|-------|
| Danh mục | Lọc theo danh mục và danh mục con |
| Khoảng giá | Thanh kéo từ-đến (min/max price) |
| Tags | Chọn nhiều tag — lọc sản phẩm có tất cả tag đã chọn |
| Đánh giá | ≥ 4 sao, ≥ 3 sao... |
| Còn hàng | Ẩn sản phẩm hết hàng |

### Sắp xếp kết quả

| Tùy chọn | Mô tả |
|----------|-------|
| Mới nhất | Theo `createdAt` DESC |
| Giá tăng dần | Theo giá ASC |
| Giá giảm dần | Theo giá DESC |
| Bán chạy | Theo tổng `quantity` trong `order_items` |
| Đánh giá cao | Theo `avgRating` DESC |

### Phân trang

- **Pagination truyền thống**: `?page=2&limit=24` — dành cho web desktop
- **Infinite scroll**: Load thêm khi cuộn đến cuối — dành cho mobile
- Mặc định 24 sản phẩm/trang

---

## Câu hỏi thường gặp

**Q: Sản phẩm không có variant thì tồn kho lấy từ đâu?**
> Lấy từ `products.stockQuantity`. Khi sản phẩm có variants, tồn kho tổng = tổng `stockQuantity` của tất cả variants đang active.

**Q: Tôi có thể thay đổi slug sau khi sản phẩm đã được đăng không?**
> Có thể nhưng **không khuyến khích**. Thay đổi slug sẽ làm mất các backlink cũ. Nếu thay, hệ thống nên thiết lập redirect 301 từ slug cũ sang slug mới.

**Q: Upload ảnh lên đâu? Có cache CDN không?**
> Ảnh được upload lên **Cloudflare R2**. Cloudflare tự động phân phối qua CDN toàn cầu, tốc độ tải nhanh cho cả khách VN và quốc tế.

**Q: Nhân viên WAREHOUSE có thể thêm sản phẩm mới không?**
> Không. WAREHOUSE chỉ có quyền cập nhật tồn kho sản phẩm đã có, không thể tạo sản phẩm mới. Tạo sản phẩm yêu cầu quyền ADMIN trở lên.

**Q: Khi nào sản phẩm tự động "Hết hàng"?**
> Khi `stockQuantity = 0` và không bật backorder. Trạng thái `Active` được giữ nguyên nhưng nút "Thêm vào giỏ" bị vô hiệu hóa, hiển thị nhãn "Hết hàng".
