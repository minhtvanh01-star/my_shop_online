Liệt kê tất cả routes đã được đăng ký trong API, kèm method, path, và middleware.

## Quy trình

### 1. Kiểm tra app.ts
Đọc `apps/api/src/app.ts`:
- Liệt kê các module đang được mount (import + app.use không bị comment).
- Liệt kê các module chưa mount (còn bị comment).

### 2. Scan tất cả routes files
Với mỗi module đã mount, đọc `apps/api/src/modules/<module>/<module>.routes.ts`.
Extract:
- HTTP method (GET/POST/PATCH/DELETE)
- Path đầy đủ (prefix từ app.ts + path trong routes file)
- Middleware: `authenticate`? `requireRole(...)`? Public?

### 3. Output

In ra bảng theo từng module:

---
**Module: auth** — `/api/v1/auth`

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /api/v1/auth/register | 🌐 Public | — |
| POST | /api/v1/auth/login | 🌐 Public | — |
| POST | /api/v1/auth/logout | 🔐 Auth | — |
| POST | /api/v1/auth/refresh | 🌐 Public | — |

---

Dùng ký hiệu:
- 🌐 Public
- 🔐 Authenticated (bất kỳ role)
- 🛡️ ADMIN+
- 🏭 WAREHOUSE+
- 👷 SUPPORT+
- ⭐ SUPER_ADMIN only

### 4. Tổng kết
- Tổng số routes đã mount.
- Danh sách modules chưa mount.
