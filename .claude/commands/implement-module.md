Implement đầy đủ module **$ARGUMENTS** cho My Shop Online API.

## Quy trình bắt buộc

### Bước 1 — Đọc context
- Đọc `CLAUDE.md` để nắm conventions.
- Đọc `.claude/rules/business-rules.md` để biết business rules nào áp dụng cho module này.
- Đọc `.claude/rules/api-conventions.md` để nắm response format và error codes.
- Đọc `.claude/rules/rbac.md` để biết phân quyền từng endpoint.
- Đọc `apps/api/src/modules/$ARGUMENTS/$ARGUMENTS.routes.ts` để biết danh sách endpoints cần implement.
- Đọc `apps/api/prisma/schema.prisma` để hiểu các model liên quan.

### Bước 2 — Đọc docs nghiệp vụ
- Đọc `docs/06-api-endpoints.md` phần tương ứng với module $ARGUMENTS.
- Đọc `docs/08-luat-nghiep-vu.md` phần tương ứng nếu có.

### Bước 3 — Implement theo thứ tự
1. `$ARGUMENTS.schema.ts` — Zod schemas cho tất cả request body/params/query
2. `$ARGUMENTS.service.ts` — Business logic + Prisma queries + business rules enforcement
3. `$ARGUMENTS.controller.ts` — Parse → service → response helpers
4. `$ARGUMENTS.routes.ts` — Wire handlers + middleware (authenticate, requireRole)

### Bước 4 — Mount module
- Uncomment import và `app.use()` trong `apps/api/src/app.ts`.

### Bước 5 — Compile check (BẮT BUỘC)
```bash
cd apps/api && npm run typecheck
```
Nếu có lỗi TypeScript → sửa hết. Không báo hoàn thành khi còn lỗi.

## Checklist trước khi báo done

- [ ] Tất cả endpoints trong routes.ts đã có handler thực sự (không còn `// TODO`)
- [ ] Mọi business rule liên quan đã được enforce trong service
- [ ] Ownership check (BR-U03) áp dụng cho các resource của customer
- [ ] Soft-delete filter `deletedAt: null` trong mọi query
- [ ] Prisma `select` loại trừ `passwordHash` và trường nhạy cảm
- [ ] Error codes dùng chuẩn từ `api-conventions.md`
- [ ] `npm run typecheck` không có lỗi
