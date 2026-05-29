Tạo và chạy seed data cho database.

## Quy trình

1. Đọc `apps/api/prisma/schema.prisma` để biết tất cả models.
2. Kiểm tra xem `apps/api/prisma/seed.ts` đã có chưa — nếu có, đọc để hiểu pattern.
3. Tạo/cập nhật seed data theo thứ tự phụ thuộc:
   ```
   Roles & Permissions → AdminAccount (SUPER_ADMIN) → Categories → Products
   → ProductImages → ProductPrices → ProductVariants → Users (customers)
   → Blog categories → Blog posts
   ```
4. Dùng `upsert` để seed idempotent (chạy nhiều lần không bị lỗi).
5. Chạy seed:
   ```bash
   cd apps/api && npm run db:seed
   ```
6. Báo cáo số bản ghi đã tạo cho mỗi model.

## Seed data cần có

- **Roles:** SUPER_ADMIN, ADMIN, WAREHOUSE, SUPPORT, CONTENT, CUSTOMER
- **Admin:** 1 tài khoản SUPER_ADMIN (email: admin@myshop.com, pass: Admin@123456)
- **Categories:** 3-5 danh mục mẫu (Điện tử, Thời trang, Gia dụng...)
- **Products:** 5-10 sản phẩm với đầy đủ: images, prices, variants, inventory
- **Customers:** 2-3 tài khoản customer mẫu để test

## Lưu ý

- Không hardcode secret thật vào seed — dùng giá trị dummy rõ ràng là test data.
- Password phải hash bằng bcrypt cost 12 (BR-U01).
- Sau khi seed, chạy `npm run typecheck` để đảm bảo không có lỗi type.
