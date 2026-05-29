Review toàn diện module **$ARGUMENTS** theo conventions và business rules của dự án.

## Scope review

### 1. Coding Standards (`.claude/rules/coding-standards.md`)
- [ ] Không dùng `any`, không có unsafe cast
- [ ] Controller không import Prisma trực tiếp
- [ ] Service không import Request/Response
- [ ] Dùng response helpers (`ok`, `created`, `paginated`) — không dùng `res.json()` thẳng
- [ ] Mọi handler có try/catch → `next(err)`
- [ ] Prisma queries có `select` (không return toàn bộ object)

### 2. Business Rules (`.claude/rules/business-rules.md`)
- [ ] Soft-delete filter `deletedAt: null` trong mọi query
- [ ] Ownership check cho Customer resources
- [ ] Stock validation trước khi trừ tồn kho
- [ ] Inventory transaction được ghi khi stock thay đổi
- [ ] Giá tính server-side, không tin client
- [ ] Các rule BR cụ thể liên quan đến module này

### 3. API Conventions (`.claude/rules/api-conventions.md`)
- [ ] Status code đúng (201 cho create, 200 cho rest)
- [ ] Error code dùng chuẩn định nghĩa
- [ ] Pagination pattern đúng

### 4. RBAC (`.claude/rules/rbac.md`)
- [ ] Mọi endpoint có đúng middleware phân quyền
- [ ] `passwordHash` không xuất hiện trong response
- [ ] Admin-only endpoints có `requireRole('ADMIN')`

### 5. TypeScript
Chạy và báo cáo kết quả:
```bash
cd apps/api && npm run typecheck 2>&1
```

## Output

Báo cáo theo dạng:

**Lỗi nghiêm trọng (phải sửa):**
- [file:line] Mô tả vấn đề

**Cảnh báo (nên sửa):**
- [file:line] Mô tả vấn đề

**Đạt:**
- Danh sách những điểm đã tốt

Sau đó hỏi có muốn sửa tự động không.
