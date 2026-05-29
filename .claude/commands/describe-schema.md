Mô tả chi tiết một Prisma model: fields, relations, và gợi ý service pattern.

**Cú pháp:** `/describe-schema <ModelName>`

**Ví dụ:**
- `/describe-schema Product`
- `/describe-schema Order`
- `/describe-schema User`

## Quy trình

### 1. Đọc schema
Đọc `apps/api/prisma/schema.prisma`, tìm model `$ARGUMENTS`.

### 2. Phân tích

**Fields:**

| Field | Type | Required | Ghi chú |
|-------|------|----------|---------|
| id | String (UUID) | ✅ | Primary key |
| name | String | ✅ | |
| deletedAt | DateTime? | ❌ | Soft delete |
| ... | | | |

**Relations:**
- Liệt kê các relation tới model khác (1-1, 1-N, N-N).
- Ghi rõ FK nằm ở bảng nào.

**Indexes & Constraints:**
- Unique fields/combinations.
- DB-level constraints (`@db.`).

### 3. Gợi ý Prisma query patterns

Dựa trên model, gợi ý code mẫu cho các operation phổ biến:

```typescript
// Tìm theo ID (có soft-delete)
await prisma.<model>.findUnique({
  where: { id, deletedAt: null },
  select: { ... },
});

// List có phân trang
await prisma.<model>.findMany({
  where: { deletedAt: null },
  skip, take: limit,
  orderBy: { createdAt: 'desc' },
});
```

### 4. Business rules liên quan
Liệt kê các BR từ `.claude/rules/business-rules.md` áp dụng cho model này.
