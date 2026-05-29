Chạy TypeScript type-check và tự động sửa tất cả lỗi tìm thấy.

## Quy trình

### Bước 1 — Chạy typecheck
```bash
cd apps/api && npm run typecheck 2>&1
```

Nếu không có lỗi → báo "Không có lỗi TypeScript" và dừng.

### Bước 2 — Phân tích lỗi
Nhóm lỗi theo file. Với từng lỗi:
- Đọc file bị lỗi tại đúng dòng đó.
- Xác định nguyên nhân: missing type, wrong type, implicit `any`, non-null assertion cần, v.v.

### Bước 3 — Sửa theo thứ tự ưu tiên
1. **Lỗi nhập sai type / missing import** — sửa trực tiếp.
2. **Implicit `any`** — thêm type annotation rõ ràng (không dùng `any`, dùng `unknown` nếu cần).
3. **Possibly undefined** — kiểm tra null trước khi dùng hoặc dùng optional chaining.
4. **Missing return type** — thêm return type annotation cho function.

### Bước 4 — Chạy lại typecheck để verify
```bash
cd apps/api && npm run typecheck 2>&1
```
Nếu còn lỗi → lặp lại Bước 2-4.

### Bước 5 — Báo cáo
- Liệt kê các lỗi đã sửa (file:line → mô tả fix).
- Nếu có lỗi không tự sửa được (cần context từ user) → mô tả rõ và hỏi.

## Giới hạn
Không dùng `// @ts-ignore` hay `as any` để tắt lỗi. Phải sửa thực sự.
