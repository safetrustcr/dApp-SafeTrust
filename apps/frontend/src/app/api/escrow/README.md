# apps/frontend/src/app/api/escrow — migrated

All escrow write routes have been moved to apps/api/src/routes/escrow/
as part of the Compute Resource Consolidation pattern.

Branch: consolidation-pattern

The frontend is now a pure UI layer:
- Reads via Apollo Client → Hasura GraphQL
- Writes via fetch() → http://localhost:3002/api/escrow/*

TRUSTLESS_WORK_API_KEY is no longer needed in apps/frontend/.env.local
