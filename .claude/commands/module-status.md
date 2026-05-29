Show the implementation status of all API modules.

For each module in `apps/api/src/modules/`, check:
- Does `<module>.routes.ts` exist? (scaffold)
- Does `<module>.controller.ts` exist and have handler functions?
- Does `<module>.service.ts` exist and have service functions?
- Does `<module>.schema.ts` exist and export schemas?
- Is the module mounted in `app.ts` (import + app.use uncommented)?

Output a markdown table with columns: Module | Routes | Controller | Service | Schema | Mounted

Then list which modules are fully implemented and which still need work.
