Chạy toàn bộ authentication flow: đăng ký → đăng nhập → lấy token → test endpoint yêu cầu auth.

Dev server phải đang chạy tại `http://localhost:4000`.

**Cú pháp:** `/test-auth-flow [email] [password]`

Nếu không truyền arguments, dùng mặc định:
- email: `test@example.com`
- password: `Test@123456`

## Quy trình

### 1. Health check
```bash
curl -s http://localhost:4000/health
```
Nếu không phản hồi → dừng lại, thông báo server chưa chạy.

### 2. Đăng ký tài khoản mới
```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>","name":"Test User"}'
```
- Ghi nhận kết quả. Nếu `EMAIL_CONFLICT` → bỏ qua, tiếp tục bước 3.

### 3. Đăng nhập
```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>"}'
```
- Extract `accessToken` và `refreshToken` từ response.

### 4. Lấy profile (test authenticated route)
```bash
curl -s http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer <accessToken>"
```

### 5. Refresh token
```bash
curl -s -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

### 6. Đăng xuất
```bash
curl -s -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

## Output

In ra bảng kết quả từng bước:

| Bước | Endpoint | Status | Kết quả |
|------|----------|--------|---------|
| Health | GET /health | ✅ 200 | OK |
| Register | POST /auth/register | ✅ 201 | User created |
| Login | POST /auth/login | ✅ 200 | Token: eyJ... |
| Profile | GET /users/me | ✅ 200 | {id, email, name} |
| Refresh | POST /auth/refresh | ✅ 200 | New token |
| Logout | POST /auth/logout | ✅ 200 | OK |

In `accessToken` ra cuối để dễ copy dùng cho các test tiếp theo.
