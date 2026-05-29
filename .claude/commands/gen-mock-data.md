Tạo dữ liệu mẫu (mock data) cho một module để test nhanh, không cần chạy seed toàn bộ DB.

**Cú pháp:** `/gen-mock-data <module> [số lượng]`

**Ví dụ:**
- `/gen-mock-data products 10`
- `/gen-mock-data users 5`
- `/gen-mock-data orders 3`

Số lượng mặc định: 5 nếu không truyền.

## Quy trình

### 1. Đọc Prisma model
Đọc `apps/api/prisma/schema.prisma` — tìm model tương ứng với module `$ARGUMENTS`.
Xác định fields bắt buộc (không có `?` và không có default).

### 2. Đọc Zod schema
Đọc `apps/api/src/modules/$ARGUMENTS/$ARGUMENTS.schema.ts` để hiểu format input hợp lệ.

### 3. Tạo script seed tạm thời
Viết file `apps/api/prisma/mock-$ARGUMENTS.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Tạo N records với data hợp lệ theo schema
  const items = await Promise.all([
    prisma.<model>.create({ data: { ... } }),
    // ...
  ]);
  console.log(`Created ${items.length} <model> records`);
  console.table(items.map(i => ({ id: i.id, ... })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 4. Chạy script
```bash
cd apps/api && npx ts-node prisma/mock-$ARGUMENTS.ts
```

### 5. In kết quả
- Hiển thị IDs và fields quan trọng của các records vừa tạo.
- Gợi ý câu lệnh curl để test với data này.

### 6. Dọn dẹp
Hỏi có muốn xóa file mock script sau khi dùng không.

## Lưu ý
- Data sinh ra phải hợp lệ theo tất cả business rules (BR).
- Password cho User mock: hash bcrypt cost 12.
- UUID tự sinh bởi Prisma (không hardcode).
