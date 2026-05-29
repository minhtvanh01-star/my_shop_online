Run a Prisma database migration for the API.

If $ARGUMENTS is provided, use it as the migration name. Otherwise, infer a descriptive name from recent schema changes.

Steps:
1. Show the current diff of `apps/api/prisma/schema.prisma` compared to the last migration.
2. Run: `cd apps/api && npx prisma migrate dev --name $ARGUMENTS`
3. After migration succeeds, run `npm run db:generate` to refresh Prisma client types.
4. Run `npm run typecheck` to verify no TypeScript errors from type changes.

Report the migration name and which tables/columns were affected.
