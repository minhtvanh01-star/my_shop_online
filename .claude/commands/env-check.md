Kiểm tra tất cả environment variables bắt buộc đã được set trong `apps/api/.env` chưa.

## Quy trình

### 1. Đọc danh sách env vars bắt buộc
Đọc `apps/api/src/config/env.ts` — lấy danh sách tất cả vars được khai báo trong Zod schema.

### 2. Đọc .env file
Đọc `apps/api/.env` (nếu tồn tại).
Đọc `apps/api/.env.example` để biết vars mẫu.

### 3. So sánh và báo cáo

In bảng:

| Env Var | Có trong .env | Có giá trị | Ghi chú |
|---------|:-------------:|:----------:|---------|
| DATABASE_URL | ✅ | ✅ | postgresql://... |
| REDIS_URL | ✅ | ✅ | redis://... |
| JWT_ACCESS_SECRET | ✅ | ✅ | (hidden) |
| JWT_REFRESH_SECRET | ❌ | ❌ | THIẾU — cần thêm |
| STRIPE_SECRET_KEY | ✅ | ⚠️ | Trống — cần điền |

### 4. Tổng kết
- Danh sách vars còn thiếu hoặc trống.
- Hướng dẫn cách thêm vào `.env`.

## Lưu ý bảo mật
- Không in ra giá trị của các secret keys (JWT, Stripe, VNPay passwords).
- Chỉ in `(set)` hoặc `(empty)` cho các trường nhạy cảm.
