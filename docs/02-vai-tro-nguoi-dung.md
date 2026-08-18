# Tài liệu 02 — Vai trò và quyền hạn người dùng

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Vai trò và quyền hạn (RBAC) |
| **Phiên bản** | 1.1.0 |
| **Ngày tạo** | 2026-05-30 |
| **Cập nhật** | 2026-08-18 — ánh xạ cách gọi vận hành Customer / Staff / Admin |

> Cách gọi hàng ngày (**Customer / Staff / Admin**, Manager để sau) và checklist “đã đủ chức năng chưa”: **`docs/11-luong-vai-tro-va-chuc-nang.md`**. File này giữ **tên role trong database**.

---

## Mục lục

1. [Tổng quan hệ thống RBAC](#1-tổng-quan-hệ-thống-rbac)
2. [Danh sách vai trò](#2-danh-sách-vai-trò)
3. [Bảng quyền chi tiết](#3-bảng-quyền-chi-tiết)
4. [Quy trình gán và thu hồi quyền](#4-quy-trình-gán-và-thu-hồi-quyền)
5. [Câu hỏi thường gặp](#5-câu-hỏi-thường-gặp)

---

## 1. Tổng quan hệ thống RBAC

Hệ thống phân quyền theo mô hình **Role-Based Access Control (RBAC)**:

- Mỗi **người dùng** có thể có **một hoặc nhiều vai trò**
- Mỗi **vai trò** chứa một tập hợp **quyền hạn (permissions)**
- Mỗi **quyền hạn** được định nghĩa theo cặp `resource:action` (ví dụ: `products:create`)
- Quyền có thể được **gán có thời hạn** (field `expiresAt` trong `user_roles`)

```
User ──── UserRole ──── Role ──── RolePermission ──── Permission
           (nhiều)     (1 role)   (nhiều)             (resource:action)
```

**Các nhóm role:**
- **System roles** (`isSystem = true`): SUPER_ADMIN, ADMIN — không thể xóa
- **Staff roles**: WAREHOUSE, SUPPORT, CONTENT — portal nhân viên (`/admin`, login `/dang-nhap-nhan-vien`). Trên vận hành gọi chung là **Staff**
- **Customer roles**: CUSTOMER — portal cửa hàng. Trên vận hành gọi là **Customer**
- **Manager** (chưa có trong DB): để sau; gần với ADMIN. Xem `docs/11`

### Ánh xạ nhanh (vận hành → DB)

| Gọi khi làm việc | Role DB | Portal |
|------------------|---------|--------|
| Customer | `CUSTOMER` | Cửa hàng |
| Staff | `WAREHOUSE` / `SUPPORT` / `CONTENT` | `/admin` |
| Admin | `ADMIN` / `SUPER_ADMIN` | `/admin` |
| Manager | *chưa tạo* | — |

---

## 2. Danh sách vai trò

---

### 2.1 SUPER_ADMIN — Quản trị tối cao

**Mô tả:** Có toàn quyền trên toàn bộ hệ thống. Thường chỉ có 1-2 người.

**Quyền hạn:**
- ✅ Tất cả quyền của ADMIN
- ✅ Tạo, sửa, xóa tài khoản admin khác
- ✅ Xem toàn bộ audit log (kể cả log nhạy cảm `isSensitive = true`)
- ✅ Thay đổi cấu hình hệ thống (system_configs)
- ✅ Bật/tắt feature flags
- ✅ Truy cập mọi dữ liệu tài chính và báo cáo
- ✅ Xóa vĩnh viễn dữ liệu (hard delete)
- ✅ Gán và thu hồi vai trò của bất kỳ người dùng nào

**Giới hạn:**
- ❌ Không thể tự xóa tài khoản Super Admin cuối cùng
- ❌ Mọi hành động đều bị audit log ghi lại

**Trường hợp sử dụng điển hình:**
- Tạo tài khoản admin mới khi có nhân viên mới
- Kiểm tra audit log khi xảy ra sự cố
- Thay đổi cấu hình thanh toán hoặc feature flag

---

### 2.2 ADMIN — Quản trị viên

**Mô tả:** Quản lý toàn bộ hoạt động kinh doanh hàng ngày. Tương đương "shop manager".

**Quyền hạn:**
- ✅ Quản lý sản phẩm (tạo, sửa, ẩn, nhân bản, xóa mềm)
- ✅ Quản lý danh mục và tags
- ✅ Xem và xử lý tất cả đơn hàng
- ✅ Cập nhật trạng thái đơn hàng
- ✅ Thực hiện hoàn tiền (refund)
- ✅ Xem thông tin khách hàng
- ✅ Quản lý coupon (tạo, sửa, hủy)
- ✅ Xem báo cáo doanh thu
- ✅ Quản lý phương thức vận chuyển
- ✅ Phê duyệt đánh giá sản phẩm
- ✅ Quản lý blog và trang CMS
- ✅ Xem audit log (trừ log nhạy cảm)

**Giới hạn:**
- ❌ Không xóa vĩnh viễn dữ liệu hệ thống
- ❌ Không thay đổi cấu hình hệ thống cốt lõi
- ❌ Không tạo/xóa tài khoản admin khác
- ❌ Không xem audit log đánh dấu `isSensitive`

---

### 2.3 WAREHOUSE — Nhân viên kho

**Mô tả:** Phụ trách nhập kho, cập nhật tồn kho, xử lý vật lý đơn hàng.

**Quyền hạn:**
- ✅ Xem danh sách sản phẩm và tồn kho
- ✅ Cập nhật số lượng tồn kho (nhập kho, điều chỉnh)
- ✅ Ghi inventory transaction (loại: `purchase`, `adjustment`, `damage`)
- ✅ Xem đơn hàng cần xử lý (status: `confirmed`, `processing`)
- ✅ Cập nhật trạng thái đơn: `confirmed` → `processing` → `shipped`
- ✅ Nhập tracking number cho đơn hàng
- ✅ Xem cảnh báo tồn kho thấp (stock alerts)

**Giới hạn:**
- ❌ Không xem giá sản phẩm chi tiết hoặc thông tin tài chính
- ❌ Không sửa thông tin sản phẩm (tên, mô tả, ảnh)
- ❌ Không xóa sản phẩm
- ❌ Không xem thông tin cá nhân của khách hàng
- ❌ Không thực hiện hoàn tiền

---

### 2.4 SUPPORT — Nhân viên chăm sóc khách hàng (CSKH)

**Mô tả:** Hỗ trợ khách hàng, xử lý khiếu nại, theo dõi đơn hàng.

**Quyền hạn:**
- ✅ Xem thông tin cơ bản của khách hàng (tên, email, phone, địa chỉ)
- ✅ Xem toàn bộ lịch sử đơn hàng của khách hàng
- ✅ Xem chi tiết từng đơn hàng
- ✅ Cập nhật trạng thái đơn hàng (trong phạm vi cho phép)
- ✅ Ghi chú nội bộ vào đơn hàng
- ✅ Gửi email thông báo cho khách hàng
- ✅ Tạo yêu cầu hoàn tiền (cần ADMIN phê duyệt)
- ✅ Xem và phản hồi đánh giá sản phẩm

**Giới hạn:**
- ❌ Không sửa thông tin sản phẩm
- ❌ Không xem báo cáo doanh thu hay số liệu tài chính
- ❌ Không tự ý xử lý hoàn tiền (chỉ tạo yêu cầu)
- ❌ Không xóa đơn hàng hay thông tin khách hàng

---

### 2.5 CONTENT — Biên tập viên nội dung

**Mô tả:** Phụ trách viết và quản lý nội dung marketing, blog, trang tĩnh.

**Quyền hạn:**
- ✅ Tạo, sửa, xuất bản bài viết blog
- ✅ Quản lý danh mục bài viết
- ✅ Tạo, sửa trang CMS tĩnh (About, Policy, FAQ...)
- ✅ Upload và quản lý file trong thư viện media
- ✅ Xem danh sách sản phẩm (chỉ xem, không sửa)
- ✅ Sửa mô tả SEO của sản phẩm (nếu được cấp thêm)

**Giới hạn:**
- ❌ Không xem thông tin đơn hàng hay khách hàng
- ❌ Không xem dữ liệu tài chính
- ❌ Không sửa giá, tồn kho, trạng thái sản phẩm
- ❌ Không truy cập trang admin quản lý đơn hàng

---

### 2.6 CUSTOMER — Khách hàng đã đăng ký

**Mô tả:** Người dùng có tài khoản, có thể đặt hàng và sử dụng đầy đủ tính năng mua sắm.

**Quyền hạn:**
- ✅ Xem và tìm kiếm sản phẩm
- ✅ Thêm vào giỏ hàng, quản lý giỏ hàng
- ✅ Đặt hàng và thanh toán (VNPay hoặc Stripe)
- ✅ Xem lịch sử đơn hàng của bản thân
- ✅ Hủy đơn khi còn ở trạng thái `pending`
- ✅ Đánh giá sản phẩm đã mua (verified purchase)
- ✅ Quản lý thông tin cá nhân và địa chỉ giao hàng
- ✅ Quản lý danh sách yêu thích (wishlist)
- ✅ Nhận thông báo email (xác nhận đơn, cập nhật trạng thái)

**Giới hạn:**
- ❌ Không truy cập bất kỳ trang admin nào
- ❌ Không xem thông tin của người dùng khác
- ❌ Chỉ được đánh giá sản phẩm đã mua và đã giao thành công

---

### 2.7 GUEST — Khách vãng lai (chưa đăng ký)

**Mô tả:** Người truy cập website chưa có tài khoản.

**Quyền hạn:**
- ✅ Xem danh sách sản phẩm, tìm kiếm, lọc
- ✅ Xem chi tiết sản phẩm (ảnh, mô tả, giá, đánh giá)
- ✅ Xem bài viết blog và trang tĩnh
- ✅ Thêm vào giỏ hàng tạm thời (lưu trong localStorage)
- ✅ Đọc đánh giá của người khác

**Giới hạn:**
- ❌ Phải đăng ký/đăng nhập để đặt hàng
- ❌ Giỏ hàng không được đồng bộ server (mất khi xóa cache browser)
- ❌ Không thể đánh giá sản phẩm
- ❌ Không thể lưu wishlist vĩnh viễn

---

## 3. Bảng quyền chi tiết

Ký hiệu: ✅ Có quyền | ❌ Không có | 🔶 Có điều kiện

| Tính năng | SUPER_ADMIN | ADMIN | WAREHOUSE | SUPPORT | CONTENT | CUSTOMER | GUEST |
|-----------|:-----------:|:-----:|:---------:|:-------:|:-------:|:--------:|:-----:|
| **SẢN PHẨM** | | | | | | | |
| Xem danh sách sản phẩm | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem chi tiết sản phẩm | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo sản phẩm mới | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sửa thông tin sản phẩm | ✅ | ✅ | ❌ | ❌ | 🔶 SEO only | ❌ | ❌ |
| Ẩn/hiện sản phẩm | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xóa sản phẩm (soft) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **TỒN KHO** | | | | | | | |
| Xem tồn kho | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cập nhật tồn kho | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem stock alerts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ĐƠN HÀNG** | | | | | | | |
| Xem đơn hàng của mình | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Xem tất cả đơn hàng | ✅ | ✅ | 🔶 Một số status | ✅ | ❌ | ❌ | ❌ |
| Cập nhật trạng thái đơn | ✅ | ✅ | 🔶 Giới hạn | 🔶 Giới hạn | ❌ | 🔶 Hủy khi pending | ❌ |
| Thực hiện hoàn tiền | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **KHÁCH HÀNG** | | | | | | | |
| Xem danh sách khách hàng | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sửa thông tin khách hàng | ✅ | ✅ | ❌ | ❌ | ❌ | 🔶 Của mình | ❌ |
| Vô hiệu hóa tài khoản | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **NỘI DUNG** | | | | | | | |
| Quản lý blog | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Quản lý trang CMS | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Upload media | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **HỆ THỐNG** | | | | | | | |
| Quản lý tài khoản admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gán vai trò người dùng | ✅ | 🔶 Roles thấp hơn | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xem audit log | ✅ | 🔶 Không nhạy cảm | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cấu hình hệ thống | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feature flags | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Quy trình gán và thu hồi quyền

### Gán vai trò mới

```
Super Admin / Admin
    │
    ├─► Vào Admin Panel → Quản lý người dùng
    ├─► Tìm tài khoản cần gán quyền
    ├─► Chọn vai trò từ danh sách
    ├─► Đặt thời hạn (tùy chọn, để trống = vĩnh viễn)
    ├─► Xác nhận → Hệ thống ghi vào bảng user_roles
    └─► Audit log ghi nhận hành động
```

### Thu hồi vai trò

```
Super Admin / Admin
    │
    ├─► Vào trang quản lý người dùng
    ├─► Chọn vai trò cần thu hồi
    ├─► Xác nhận → user_roles.revokedAt = now()
    └─► Vai trò bị vô hiệu ngay lập tức (không cần logout)
```

### Lưu ý quan trọng

- Mọi thay đổi vai trò đều được **audit log** ghi lại
- ADMIN chỉ được gán các vai trò có cấp thấp hơn mình (không thể gán SUPER_ADMIN)
- Vai trò có thể được đặt **ngày hết hạn** — hữu ích cho nhân viên tạm thời
- Một người dùng có thể có **nhiều vai trò** cùng lúc (quyền được cộng dồn)

---

## 5. Câu hỏi thường gặp

**Q: Nếu một người có cả vai trò ADMIN và CONTENT, quyền nào áp dụng?**
> Quyền được **cộng dồn**. Người đó có tất cả quyền của ADMIN cộng với quyền của CONTENT. Không có xung đột vì RBAC chỉ cấp thêm, không trừ đi.

**Q: Làm sao phân biệt WAREHOUSE chỉ thấy đơn hàng "cần xử lý"?**
> API sẽ lọc theo `status IN (confirmed, processing)` khi request đến từ token có role WAREHOUSE. Logic này được kiểm tra ở tầng middleware RBAC trong backend.

**Q: Có thể tạo thêm vai trò tùy chỉnh không?**
> Có. Bảng `roles` và `permissions` cho phép tạo vai trò mới tùy ý. Chỉ cần tạo role, gán permissions, rồi gán cho người dùng qua bảng `user_roles`.

**Q: Nhân viên nghỉ việc thì xử lý như thế nào?**
> Vô hiệu hóa tài khoản (`isActive = false`) trong bảng `users` và `admin_accounts`. Không cần xóa — dữ liệu lịch sử vẫn giữ nguyên, chỉ chặn đăng nhập.

**Q: Tại sao cần bảng AdminAccount riêng thay vì chỉ dùng User?**
> `AdminAccount` lưu thông tin đặc thù của nhân viên như `employeeCode`, `department`, `lastLoginAt`. Tách riêng giúp không "ô nhiễm" bảng `users` và dễ audit nhân sự.
