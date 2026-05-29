Debug một endpoint đang bị lỗi trong My Shop Online API.

**Cú pháp:** `/debug-api <METHOD> <path> [mô tả lỗi]`

**Ví dụ:**
- `/debug-api POST /api/v1/auth/login 401 Unauthorized`
- `/debug-api GET /api/v1/products 500 Internal Server Error`
- `/debug-api PATCH /api/v1/orders/:id/cancel 400 ORDER_CANNOT_CANCEL`

## Quy trình

### Bước 1 — Xác định module
- Parse path → tìm module tương ứng trong `apps/api/src/modules/`.
- Kiểm tra module có được mount trong `apps/api/src/app.ts` chưa.

### Bước 2 — Trace qua từng layer
1. **Routes:** `<module>.routes.ts` — middleware stack có đúng không? (`authenticate`, `requireRole`)
2. **Controller:** `<module>.controller.ts` — có `try/catch → next(err)` không? Parse Zod đúng chưa?
3. **Service:** `<module>.service.ts` — Business rule logic, Prisma queries có `deletedAt: null` không?
4. **Schema:** `<module>.schema.ts` — Zod schema khớp với request body/params không?

### Bước 3 — Kiểm tra theo loại lỗi

| Lỗi | Kiểm tra |
|-----|----------|
| 401 | Token có được gửi không? `auth.middleware.ts` parse Bearer đúng chưa? |
| 403 | `requireRole` có đúng role không? Ownership check có fail không? |
| 404 | `deletedAt: null` filter? Resource thực sự tồn tại không? |
| 400 | Business rule nào đang fail? Zod schema reject body không? |
| 409 | Unique constraint: SKU/email/slug đã tồn tại? |
| 500 | Prisma error? Thiếu env var? Sai relation trong query? |

### Bước 4 — Báo cáo
- Liệt kê nguyên nhân khả năng nhất.
- Chỉ đúng file:line cần xem.
- Đề xuất fix cụ thể.
- Hỏi có muốn áp dụng fix không.
