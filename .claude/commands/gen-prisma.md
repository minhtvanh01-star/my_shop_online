Regenerate Prisma client sau khi schema thay đổi.

```bash
cd apps/api && npm run db:generate
```

Sau khi generate xong, chạy typecheck để đảm bảo code hiện tại vẫn compile:

```bash
cd apps/api && npm run typecheck
```

Nếu có lỗi TypeScript do thay đổi schema (ví dụ field bị đổi tên, type thay đổi):
- Liệt kê các file bị ảnh hưởng.
- Hỏi có muốn sửa tự động không.
