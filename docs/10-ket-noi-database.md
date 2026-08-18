# Hướng dẫn kết nối PostgreSQL — My Shop Online

Tài liệu này mô tả cách cài PostgreSQL native (Windows), cấu hình Prisma/API, seed dữ liệu và kết nối bằng **DBeaver** — **không cần Docker**.

---

## 1. Tổng quan

| Thành phần | Giá trị mặc định dev |
|------------|----------------------|
| Engine | PostgreSQL 14+ |
| Host | `localhost` |
| Port | `5432` |
| Database | `myshop_db` (hoặc tên bạn tạo) |
| User | `postgres` |
| Schema Prisma | `public` |
| File cấu hình | `apps/api/.env` → `DATABASE_URL` |
| ORM | Prisma (`apps/api/prisma/schema.prisma`) |

**Chuỗi kết nối (format Prisma):**

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

**Ví dụ (máy local):**

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/myshop_db?schema=public"
```

---

## 2. Cài PostgreSQL trên Windows (native)

1. Tải installer từ [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) (EDB installer).
2. Chọn components: **PostgreSQL Server**, **pgAdmin 4** (tuỳ chọn), **Command Line Tools**.
3. Đặt **port** `5432` (mặc định).
4. Đặt **mật khẩu superuser** cho user `postgres` — ghi nhớ mật khẩu này.
5. Hoàn tất cài đặt; đảm bảo service **postgresql-x64-XX** đang **Running**:
   - `Win + R` → `services.msc` → tìm **postgresql** → Start nếu đang Stopped.

**Kiểm tra nhanh (PowerShell):**

```powershell
# PostgreSQL có lắng nghe port 5432 không
Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
```

---

## 3. Tạo database

### Cách A — psql (khuyến nghị)

Mở **SQL Shell (psql)** hoặc PowerShell:

```powershell
# Đường dẫn psql có thể khác theo phiên bản, ví dụ:
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost
```

Trong psql:

```sql
-- Liệt kê database hiện có
\l

-- Tạo database cho project (chạy một lần)
CREATE DATABASE myshop_db
  WITH ENCODING 'UTF8'
       LC_COLLATE 'English_United States.utf8'
       LC_CTYPE 'English_United States.utf8'
       TEMPLATE template0;

-- Kiểm tra
\c myshop_db
\dt
```

### Cách B — pgAdmin

1. Mở pgAdmin → Servers → PostgreSQL → Databases.
2. Chuột phải **Databases** → **Create** → **Database**.
3. Name: `myshop_db` → Save.

---

## 4. Cấu hình project (Prisma / API)

### 4.1. Tạo file `.env`

```powershell
cd E:\project_job\my_shop_online\apps\api
copy .env.example .env
```

Sửa `DATABASE_URL` trong `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/myshop_db?schema=public"
REDIS_URL=memory
```

Thay `YOUR_PASSWORD` bằng mật khẩu user `postgres` bạn đã đặt lúc cài.

> **Lưu ý:** Nếu mật khẩu có ký tự đặc biệt (`@`, `#`, `%`…), cần **URL-encode** trong connection string (ví dụ `@` → `%40`).

### 4.2. Cài dependency & generate client

```powershell
cd E:\project_job\my_shop_online
npm run setup

cd apps\api
npm run db:generate
```

### 4.3. Chạy migration (tạo 42 bảng)

```powershell
cd E:\project_job\my_shop_online\apps\api
npm run db:migrate
```

Lần đầu Prisma hỏi tên migration — có thể dùng tên có sẵn hoặc `init`.

**Kiểm tra trạng thái migration:**

```powershell
npx prisma migrate status
```

Kết quả mong đợi: tất cả migration **Applied**.

### 4.4. Seed dữ liệu mẫu

```powershell
npm run db:seed
```

Seed tạo: users (admin + customer), categories, products, blog, settings (tỉ giá), v.v.

### 4.5. Xem dữ liệu bằng Prisma Studio (trong trình duyệt)

```powershell
npm run db:studio
```

Mở URL in ra terminal (thường `http://localhost:5555`).

---

## 5. Kết nối DBeaver

### 5.1. Tạo connection mới

1. Mở **DBeaver** → **Database** → **New Database Connection**.
2. Chọn **PostgreSQL** → **Next**.

### 5.2. Tab *Main*

| Field | Giá trị |
|-------|---------|
| Host | `localhost` |
| Port | `5432` |
| Database | `myshop_db` |
| Username | `postgres` |
| Password | mật khẩu PostgreSQL của bạn |
| ☑ Save password | tuỳ chọn |

Bấm **Test Connection**.

- Lần đầu DBeaver có thể hỏi tải driver PostgreSQL — chọn **Download**.
- Thành công: hộp thoại **Connected**.

### 5.3. Duyệt bảng

1. Mở cây: **myshop_db** → **Schemas** → **public** → **Tables**.
2. Chuột phải bảng (vd. `products`) → **View data**.

### 5.4. JDBC URL (tham khảo)

DBeaver tự sinh; nếu cần nhập tay:

```
jdbc:postgresql://localhost:5432/myshop_db
```

---

## 6. Xác minh kết nối từ API

### 6.1. Health qua Prisma

```powershell
cd E:\project_job\my_shop_online\apps\api
npx prisma db execute --stdin <<< "SELECT 1 AS ok;"
```

Hoặc trong psql:

```sql
\c myshop_db
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Kỳ vọng ~42 bảng sau migrate
```

### 6.2. Chạy API + web

```powershell
cd E:\project_job\my_shop_online
npm run dev
```

- API: [http://localhost:4000/health](http://localhost:4000/health)
- Web: [http://localhost:3000/vi](http://localhost:3000/vi)

Nếu API khởi động không lỗi Prisma → `DATABASE_URL` đúng.

---

## 7. Tài khoản test (sau seed)

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Khách hàng | `customer@myshop.dev` | `Customer@123!` |
| Admin | `admin@myshop.dev` | `Admin@123!` |
| Super Admin | `superadmin@myshop.dev` | `SuperAdmin@123!` |
| Kho | `warehouse@myshop.dev` | `Warehouse@123!` |
| Hỗ trợ | `support@myshop.dev` | `Support@123!` |

Đăng nhập khách: `/vi/dang-nhap` — Nhân viên: `/vi/dang-nhap-nhan-vien`.

---

## 8. Lệnh thường dùng

Chạy từ `apps/api/`:

| Lệnh | Mục đích |
|------|----------|
| `npm run db:generate` | Sinh lại Prisma Client sau đổi schema |
| `npm run db:migrate` | Tạo + apply migration mới (dev) |
| `npm run db:push` | Đẩy schema trực tiếp (prototype, không tạo file migration) |
| `npm run db:seed` | Nạp lại dữ liệu mẫu |
| `npm run db:studio` | UI xem/sửa DB |
| `npx prisma migrate status` | Kiểm tra migration |
| `npx prisma migrate reset` | **Xóa toàn bộ data** + migrate lại + seed (chỉ dev!) |

---

## 9. Xử lý lỗi thường gặp

### `P1001: Can't reach database server`

- PostgreSQL service chưa chạy → Start trong `services.msc`.
- Sai host/port → kiểm tra `localhost:5432`.
- Firewall chặn → cho phép PostgreSQL trên mạng local.

### `password authentication failed for user "postgres"`

- Sai mật khẩu trong `DATABASE_URL`.
- Đổi mật khẩu trong psql: `ALTER USER postgres PASSWORD 'new_password';` rồi cập nhật `.env`.

### `database "myshop_db" does not exist`

- Chưa tạo DB → làm bước **§3** (`CREATE DATABASE myshop_db`).

### `Environment variable not found: DATABASE_URL`

- File `.env` phải nằm tại `apps/api/.env`, không phải thư mục root (trừ khi bạn export biến môi trường).

### Migration pending / schema drift

```powershell
cd apps\api
npx prisma migrate status
npm run db:migrate
```

### DBeaver: connection refused

- Cùng nguyên nhân với P1001 — kiểm tra service PostgreSQL và port 5432.

### Seed báo lỗi unique constraint

- Seed dùng `upsert` — thường an toàn khi chạy lại.
- Nếu DB lộn xộn: `npx prisma migrate reset` (mất data) rồi `npm run db:seed`.

---

## 10. Redis (không bắt buộc cho DB)

API dùng Redis cho session/cache. Dev local **không cần cài Redis** nếu:

```env
REDIS_URL=memory
```

PostgreSQL vẫn là nguồn dữ liệu chính; Redis không thay thế DB.

---

## 11. Checklist nhanh

- [ ] PostgreSQL service đang chạy
- [ ] Database `myshop_db` đã tạo
- [ ] `apps/api/.env` có `DATABASE_URL` đúng user/password/db
- [ ] `npm run db:migrate` — Applied
- [ ] `npm run db:seed` — thành công
- [ ] DBeaver Test Connection — OK
- [ ] `npm run dev` — API không lỗi Prisma

---

*Tài liệu liên quan: `CLAUDE.md`, `docs/07-cau-truc-du-lieu.md`, `apps/api/.env.example`.*
