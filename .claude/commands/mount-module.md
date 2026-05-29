Mount the **$ARGUMENTS** module in `apps/api/src/app.ts` by uncommenting its import and `app.use()` line.

Steps:
1. Read `app.ts` and find the commented-out import for `$ARGUMENTS`.
2. Uncomment the import line.
3. Find the commented-out `app.use(...)` line for `$ARGUMENTS`.
4. Uncomment it.
5. Run `npm run typecheck` from `apps/api/` to confirm no errors.
6. Report what was changed.

If the import or route line doesn't exist yet (module was added after the initial scaffold), add them in the correct sections.
