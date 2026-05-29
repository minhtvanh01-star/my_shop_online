Thêm một endpoint mới vào module đã có.

**Cú pháp:** `/add-endpoint <module> <METHOD> <path> [mô tả ngắn]`

**Ví dụ:**
- `/add-endpoint products GET /:id/variants Lấy danh sách variants của sản phẩm`
- `/add-endpoint orders PATCH /:id/cancel Hủy đơn hàng`

## Quy trình

1. Đọc `apps/api/src/modules/$ARGUMENTS/` để hiểu pattern hiện tại của module.
2. Đọc `.claude/rules/business-rules.md` — kiểm tra có business rule nào áp dụng cho endpoint này không.
3. Đọc `docs/06-api-endpoints.md` phần tương ứng để biết spec chính xác.
4. Thêm vào `<module>.schema.ts`: Zod schema cho request (nếu có body/params mới).
5. Thêm vào `<module>.service.ts`: service function mới.
6. Thêm vào `<module>.controller.ts`: handler function mới.
7. Thêm vào `<module>.routes.ts`: route mới với đúng method, path, middleware.
8. Chạy typecheck:
```bash
cd apps/api && npm run typecheck
```
Sửa hết lỗi trước khi báo xong.

## Lưu ý

- Phân quyền theo `.claude/rules/rbac.md` — đặt đúng `authenticate` + `requireRole`.
- Response format theo `.claude/rules/api-conventions.md`.
- Error codes dùng chuẩn đã định nghĩa.
