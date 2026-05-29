# API Conventions — My Shop Online

Áp dụng cho mọi endpoint trong `apps/api/src/modules/`.

---

## Response format

```jsonc
// Thành công đơn lẻ
{ "data": { ... } }

// Thành công danh sách phân trang
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8, "hasNextPage": true, "hasPrevPage": false }
}

// Lỗi
{ "error": "Mô tả lỗi", "code": "ERROR_CODE", "details": { "field": ["message"] } }
```

**Luôn dùng response helpers** từ `utils/response.ts`:
- `ok(res, data)` → 200
- `created(res, data)` → 201
- `paginated(res, data, { page, limit, total })` → 200 + meta
- Không bao giờ dùng `res.json()` trực tiếp trong controller.

---

## HTTP Status Codes

| Code | Dùng khi |
|------|----------|
| 200 | GET/PATCH/DELETE thành công |
| 201 | POST tạo resource mới |
| 400 | Logic nghiệp vụ thất bại (không đủ stock, sản phẩm không active...) |
| 401 | Chưa đăng nhập / token hết hạn |
| 403 | Đã đăng nhập nhưng không có quyền |
| 404 | Resource không tìm thấy |
| 409 | Conflict (email/SKU đã tồn tại) |
| 422 | Validation thất bại (Zod parse error — tự động) |
| 500 | Server error (không lộ stack trong production) |

---

## Authentication

Ký hiệu quyền trong doc:
- 🌐 Public — không cần middleware
- 🔐 Customer — `authenticate`
- 🛡️ Admin — `authenticate, requireRole('ADMIN')`
- 🏭 Warehouse — `authenticate, requireRole('WAREHOUSE', 'ADMIN', 'SUPER_ADMIN')`
- 👷 Support — `authenticate, requireRole('SUPPORT', 'ADMIN', 'SUPER_ADMIN')`

```typescript
// routes.ts
router.get('/', productListHandler);                                    // 🌐
router.get('/me', authenticate, getMeHandler);                          // 🔐
router.post('/', authenticate, requireRole('ADMIN'), createHandler);    // 🛡️
```

---

## Pagination

Pattern chuẩn trong mọi list endpoint:

```typescript
const page = Math.max(1, Number(req.query.page) || 1);
const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  prisma.product.findMany({ skip, take: limit, where, orderBy }),
  prisma.product.count({ where }),
]);

paginated(res, items, { page, limit, total });
```

---

## Error codes chuẩn

```
EMAIL_CONFLICT          409  Email đã tồn tại
SKU_CONFLICT            409  SKU đã tồn tại
SLUG_CONFLICT           409  Slug đã tồn tại
PRODUCT_NOT_FOUND       404  Sản phẩm không tìm thấy
PRODUCT_NO_IMAGE        400  Sản phẩm cần ít nhất 1 ảnh
PRODUCT_INACTIVE        400  Sản phẩm chưa được kích hoạt
INSUFFICIENT_STOCK      400  Không đủ tồn kho
ORDER_NOT_FOUND         404  Đơn hàng không tìm thấy
ORDER_CANNOT_CANCEL     400  Không thể hủy đơn ở trạng thái này
INVALID_COUPON          400  Coupon không hợp lệ
COUPON_EXPIRED          400  Coupon đã hết hạn
COUPON_EXHAUSTED        400  Coupon đã hết lượt dùng
PAYMENT_VERIFY_FAILED   400  Xác thực thanh toán thất bại
UNAUTHORIZED            401  Token không hợp lệ
FORBIDDEN               403  Không có quyền truy cập
```

---

## Naming conventions

- **Route params:** `camelCase` → `:productId`, `:orderId`, `:userId`
- **Query params:** `camelCase` → `?sortBy=createdAt&sortDir=desc`
- **Request body:** `camelCase`
- **Response fields:** `camelCase` (Prisma trả về camelCase tự nhiên)
- **Route files:** không prefix `/api/v1` — prefix đặt trong `app.ts`

---

## File upload

- Content-Type: `multipart/form-data`
- Validate MIME type trong middleware (chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`)
- Giới hạn kích thước: 5MB mỗi file, tối đa 10 file/request
- Lưu trên Cloudflare R2, trả về URL công khai
- Tên file: `{uuid}.{ext}` — không dùng tên gốc của user
