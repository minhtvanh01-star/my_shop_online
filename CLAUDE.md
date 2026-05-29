# My Shop Online — Claude Context

@.claude/rules/business-rules.md
@.claude/rules/api-conventions.md
@.claude/rules/rbac.md
@.claude/rules/coding-standards.md

## Project Overview

Full e-commerce platform serving both domestic (VN) and international customers.

- **Monorepo root:** `e:/project_job/my_shop_online/`
- **Backend:** `apps/api/` — Node.js + Express + TypeScript
- **Database:** PostgreSQL via Prisma ORM (`apps/api/prisma/schema.prisma`)
- **Cache:** Redis (ioredis)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Payments:** Stripe (international) + VNPay (Vietnam)
- **API prefix:** `/api/v1`

## Directory Structure

```
apps/api/src/
├── app.ts                    # Express bootstrap, middleware, route mounting
├── config/
│   ├── database.ts           # Prisma client singleton
│   ├── env.ts                # Validated env vars (Zod)
│   └── redis.ts              # Redis client singleton
├── middlewares/
│   ├── auth.middleware.ts     # JWT verify → req.user
│   ├── rbac.middleware.ts     # Role-based access (requireRole)
│   ├── audit.middleware.ts    # Audit log writes
│   └── error.middleware.ts    # AppError + ZodError + Prisma error handler
├── modules/
│   └── <module>/
│       ├── <module>.routes.ts
│       ├── <module>.controller.ts
│       ├── <module>.service.ts
│       └── <module>.schema.ts
└── utils/
    └── response.ts            # ok(), created(), paginated()
```

## Implemented Modules

| Module     | Routes | Controller | Service | Schema | Mounted |
|------------|:------:|:----------:|:-------:|:------:|:-------:|
| auth       | ✅     | ✅         | ✅      | ✅     | ❌      |
| users      | ✅     | ❌         | ❌      | ❌     | ❌      |
| products   | ✅     | ✅         | ✅      | ✅     | ❌      |
| categories | ✅     | ❌         | ❌      | ❌     | ❌      |
| orders     | ✅     | ❌         | ❌      | ✅     | ❌      |
| cart       | ✅     | ✅         | ✅      | ✅     | ❌      |
| payments   | ✅     | ❌         | ❌      | ❌     | ❌      |
| reviews    | ✅     | ❌         | ❌      | ❌     | ❌      |
| wishlist   | ✅     | ❌         | ❌      | ❌     | ❌      |
| blog       | ✅     | ❌         | ❌      | ❌     | ❌      |
| pages      | ✅     | ❌         | ❌      | ❌     | ❌      |
| media      | ✅     | ❌         | ❌      | ❌     | ❌      |
| admin      | ✅     | ❌         | ❌      | ❌     | ❌      |
| settings   | ✅     | ❌         | ❌      | ❌     | ❌      |

To mount a module, uncomment its import + `app.use()` in `app.ts`.

## Coding Conventions

### Module anatomy

Every module follows this exact layered pattern:

```typescript
// schema.ts  — Zod input validation
export const CreateProductSchema = z.object({ ... });
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

// service.ts  — business logic + Prisma calls (no req/res)
export async function createProduct(dto: CreateProductDto) { ... }

// controller.ts  — parse+validate → call service → respond
export async function createProductHandler(req, res, next) {
  try {
    const dto = CreateProductSchema.parse(req.body);
    const result = await ProductService.createProduct(dto);
    created(res, result);
  } catch (err) { next(err); }
}

// routes.ts  — wire up middleware + handlers
router.post('/', authenticate, requireRole('admin'), createProductHandler);
```

### Response helpers (`utils/response.ts`)

```typescript
ok(res, data)              // 200 { data }
created(res, data)         // 201 { data }
paginated(res, data, meta) // 200 { data, meta: { page, limit, total, totalPages, ... } }
```

Never use `res.json()` or `res.status()` directly in controllers — always use these helpers.

### Error handling

Throw `AppError` from service layer:

```typescript
import { AppError } from '../../middlewares/error.middleware';
throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
throw new AppError(409, 'Email already exists', 'EMAIL_CONFLICT');
```

Zod parse errors and Prisma constraint errors (P2002, P2025) are caught automatically by the global error handler.

### Authentication middleware

```typescript
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';

router.get('/profile', authenticate, handler);
router.delete('/:id', authenticate, requireRole('admin'), handler);
```

`req.user` is typed after `authenticate` middleware.

### Pagination pattern

```typescript
const page = Number(req.query.page) || 1;
const limit = Math.min(Number(req.query.limit) || 20, 100);
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  prisma.product.findMany({ skip, take: limit, where }),
  prisma.product.count({ where }),
]);
paginated(res, items, { page, limit, total });
```

## Critical Rules

1. **Stripe webhook** needs raw body — mount its route BEFORE `express.json()` in `app.ts`:
   ```typescript
   app.post('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
   app.use(express.json());
   ```

2. **Never import prisma directly** in controllers — only in services.

3. **All env vars** must be validated through `config/env.ts` (Zod schema). Never use `process.env.X` directly.

4. **Secrets** (JWT, Stripe, VNPay) must never be hardcoded. `.env` is gitignored.

5. **UUID** primary keys — all IDs are `String @db.Uuid`. Use `prisma.$queryRaw` only when Prisma query API is insufficient.

## Dev Commands

Run from `apps/api/`:

```bash
npm run dev          # start dev server (port 4000, ts-node-dev)
npm run typecheck    # tsc --noEmit
npm run build        # compile to dist/
npm run db:migrate   # prisma migrate dev
npm run db:generate  # prisma generate
npm run db:studio    # open Prisma Studio
npm run db:seed      # seed database
```

Run from monorepo root:

```bash
npm run dev          # workspace dev (if configured)
```

## Environment

Copy `.env.example` → `.env` in `apps/api/`. Required variables:
`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

Services used in production: Cloudflare R2, Stripe, VNPay, PostgreSQL, Redis.
