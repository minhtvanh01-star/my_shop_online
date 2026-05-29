Scaffold a new API module named **$ARGUMENTS** in `apps/api/src/modules/$ARGUMENTS/`.

Create the following four files following the project conventions in CLAUDE.md:

1. **`$ARGUMENTS.schema.ts`** — Zod schemas for all request bodies/params this module needs (Create, Update, Query DTOs). Export both the schema and its inferred type.

2. **`$ARGUMENTS.service.ts`** — Async service functions with Prisma queries. Import `prisma` from `../../config/database`. Throw `AppError` for domain errors. No Express types here.

3. **`$ARGUMENTS.controller.ts`** — Handler functions: parse input with the Zod schema, call service, respond with `ok()`/`created()`/`paginated()`. Always wrap in try/catch → `next(err)`.

4. **`$ARGUMENTS.routes.ts`** — Express Router wiring handlers to HTTP methods. Apply `authenticate` and `requireRole` middleware as appropriate.

After creating all four files:
- Show me what needs to be added to `app.ts` to mount this module (import + `app.use()` line).
- Run `npm run typecheck` from `apps/api/` to confirm no TypeScript errors.