# Coding Standards — My Shop Online API

Áp dụng cho toàn bộ code trong `apps/api/src/`.

---

## TypeScript

- Không dùng `any`. Dùng `unknown` nếu type chưa xác định rồi narrow.
- Không dùng `!` non-null assertion trừ khi chắc chắn 100%.
- Không dùng `as` type cast trừ khi không còn cách nào khác.
- `strict: true` trong tsconfig — không tắt.
- Prefer `interface` cho object shapes, `type` cho unions/intersections.
- Export type cùng với schema: `export type CreateProductDto = z.infer<typeof CreateProductSchema>`.

---

## Naming

| Thứ | Convention | Ví dụ |
|-----|-----------|-------|
| Files | kebab-case | `product-images.service.ts` |
| Classes / Enums | PascalCase | `OrderStatus`, `AppError` |
| Functions / variables | camelCase | `createProduct`, `stockQuantity` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE`, `JWT_EXPIRES_IN` |
| Zod schemas | PascalCase + Schema suffix | `CreateProductSchema` |
| Handlers | camelCase + Handler suffix | `createProductHandler` |
| Routes file export | default `router` | `export default router` |

---

## Module structure (bắt buộc)

```
<module>/
├── <module>.schema.ts     # Zod DTOs — không import Express
├── <module>.service.ts    # Business logic + Prisma — không import Express
├── <module>.controller.ts # Handlers (Request/Response) — không import Prisma
└── <module>.routes.ts     # Express Router
```

**Không trộn lẫn layer:**
- Service không import `Request`, `Response`.
- Controller không import `prisma` trực tiếp.
- Schema không chứa business logic.

---

## Controller pattern

```typescript
export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateProductSchema.parse(req.body);  // Zod validate
    const result = await ProductService.createProduct(dto, req.user!.id);
    created(res, result);                              // response helper
  } catch (err) {
    next(err);                                         // global error handler
  }
}
```

- Một handler = một try/catch duy nhất → `next(err)`.
- Không gọi `res.json()` / `res.status()` trực tiếp.
- Không log lỗi trong controller — để global handler làm.

---

## Service pattern

```typescript
export async function createProduct(dto: CreateProductDto, actorId: string) {
  // 1. Business rule validation
  const exists = await prisma.product.findUnique({ where: { sku: dto.sku } });
  if (exists) throw new AppError(409, 'SKU đã tồn tại', 'SKU_CONFLICT');

  // 2. DB operation
  return prisma.product.create({
    data: { ...dto, createdBy: actorId },
    select: { id: true, name: true, sku: true, basePrice: true }, // explicit select
  });
}
```

- Luôn dùng `select` hoặc `omit` để không trả dữ liệu nhạy cảm.
- Throw `AppError` cho lỗi nghiệp vụ, không throw string.
- Multi-step write → `prisma.$transaction`.

---

## Prisma

```typescript
// ✅ Đúng — explicit select
const product = await prisma.product.findUnique({
  where: { id, deletedAt: null },
  select: { id: true, name: true, basePrice: true },
});

// ❌ Sai — không filter soft-delete, không select
const product = await prisma.product.findUnique({ where: { id } });
```

- Mọi query Product/User phải có `deletedAt: null`.
- Không dùng `prisma.$queryRaw` trừ khi Prisma API thực sự không hỗ trợ.
- Atomic operations → `prisma.$transaction([op1, op2])`.

---

## Zod Schema

```typescript
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100).toUpperCase(),
  basePrice: z.number().positive(),
  categoryId: z.string().uuid(),
  description: z.string().optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
```

- Dùng `.uuid()` cho ID fields.
- Dùng `.positive()` cho price/quantity.
- Dùng `.min(1)` cho required strings (tránh empty string).
- Schema tên: `CreateXxxSchema`, `UpdateXxxSchema`, `QueryXxxSchema`.

---

## Environment variables

```typescript
// ✅ Đúng — qua config/env.ts
import { env } from '../../config/env';
const secret = env.JWT_ACCESS_SECRET;

// ❌ Sai — trực tiếp từ process.env
const secret = process.env.JWT_ACCESS_SECRET;
```

Mọi env var phải được khai báo và validate trong `config/env.ts` (Zod schema).

---

## Error handling

```typescript
// Lỗi nghiệp vụ
throw new AppError(400, 'Không đủ tồn kho', 'INSUFFICIENT_STOCK');
throw new AppError(404, 'Sản phẩm không tìm thấy', 'PRODUCT_NOT_FOUND');
throw new AppError(409, 'Email đã tồn tại', 'EMAIL_CONFLICT');
throw new AppError(403, 'Không có quyền', 'FORBIDDEN');

// Prisma P2002 (unique violation) → errorHandler tự convert → 409
// Prisma P2025 (not found) → errorHandler tự convert → 404
// ZodError → errorHandler tự convert → 422
```

---

## Comments

- Không comment giải thích WHAT (code đủ rõ).
- Chỉ comment giải thích WHY nếu có ràng buộc không hiển nhiên.
- Không comment TODO mà không có task tracker ID.

---

## Sau khi hoàn thành implementation

Bắt buộc chạy trước khi báo done:
```bash
cd apps/api && npm run typecheck
```
Nếu có lỗi TypeScript → sửa hết trước khi báo hoàn thành.
