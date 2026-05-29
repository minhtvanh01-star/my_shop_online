# RBAC Rules — My Shop Online

Hệ thống phân quyền Role-Based Access Control.

---

## Phân cấp role

```
SUPER_ADMIN  (toàn quyền, kể cả system config, hard delete)
    └── ADMIN       (quản lý kinh doanh hàng ngày)
            ├── WAREHOUSE   (nhập kho, cập nhật tồn kho, xử lý đơn vật lý)
            ├── SUPPORT     (CSKH, theo dõi đơn hàng)
            └── CONTENT     (blog, CMS, media)
CUSTOMER    (khách đăng ký — tách biệt với staff)
GUEST       (chưa đăng nhập — chỉ xem, không cần token)
```

Quyền **cộng dồn**: user có nhiều role → hợp nhất tất cả permissions.

---

## Middleware pattern

```typescript
// Public — không cần middleware
router.get('/products', listProductsHandler);

// Bất kỳ user đã đăng nhập
router.get('/me/orders', authenticate, getMyOrdersHandler);

// Chỉ admin trở lên
router.post('/products', authenticate, requireRole('ADMIN'), createProductHandler);

// Warehouse + admin
router.patch('/inventory', authenticate, requireRole('WAREHOUSE', 'ADMIN', 'SUPER_ADMIN'), updateStockHandler);

// Support + admin
router.get('/admin/customers', authenticate, requireRole('SUPPORT', 'ADMIN', 'SUPER_ADMIN'), listCustomersHandler);

// Chỉ Super Admin
router.delete('/system/reset', authenticate, requireRole('SUPER_ADMIN'), resetHandler);
```

---

## Ownership check (BR-U03)

Customer chỉ được thao tác resource của chính mình. Luôn kiểm tra trong service:

```typescript
const order = await prisma.order.findUnique({ where: { id } });
if (!order) throw new AppError(404, 'Đơn hàng không tìm thấy', 'ORDER_NOT_FOUND');
if (order.userId !== actorId) throw new AppError(403, 'Không có quyền truy cập', 'FORBIDDEN');
```

---

## Bảng quyền theo tính năng

| Tính năng | GUEST | CUSTOMER | SUPPORT | WAREHOUSE | ADMIN | SUPER_ADMIN |
|-----------|:-----:|:--------:|:-------:|:---------:|:-----:|:-----------:|
| Xem sản phẩm active | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem tất cả sản phẩm (kể cả inactive) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Tạo/sửa/xóa sản phẩm | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem tồn kho | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Cập nhật tồn kho | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Đặt hàng | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem đơn hàng của mình | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem tất cả đơn hàng | ❌ | ❌ | ✅ | 🔶 | ✅ | ✅ |
| Hủy đơn (pending) | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Hoàn tiền | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Quản lý blog/CMS | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Upload media | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem audit log | ❌ | ❌ | ❌ | ❌ | 🔶 | ✅ |
| Cấu hình hệ thống | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gán/thu hồi role | ❌ | ❌ | ❌ | ❌ | 🔶 | ✅ |

🔶 = có điều kiện (xem chi tiết trong docs/02-vai-tro-nguoi-dung.md)

---

## Audit log

Mọi thao tác nhạy cảm phải qua `audit.middleware.ts`:
- Thay đổi role user
- Xóa sản phẩm / đơn hàng
- Cấu hình thanh toán
- Bật/tắt feature flags

ADMIN chỉ xem log `isSensitive = false`. SUPER_ADMIN xem tất cả.

---

## Quan trọng

- ADMIN chỉ được gán role thấp hơn (không gán ADMIN/SUPER_ADMIN cho người khác)
- Không thể xóa SUPER_ADMIN cuối cùng trong hệ thống
- Role hỗ trợ `expiresAt` — vô hiệu tự động sau ngày hết hạn
- Thay đổi role có hiệu lực ngay, không cần logout
