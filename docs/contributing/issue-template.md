# Issue Template Guide

Every SafeTrust GitHub issue follows a strict template. This guide
explains each section and what makes a high-quality issue.

## Template structure

```
Title: type(scope): short description — detail sentence
```

### Required sections

| Section | Purpose |
|---|---|
| Issue Summary | One paragraph — what problem, why it matters, what the fix is |
| Type of Issue | Checkbox: Bug / Feature / Docs / Performance / Security / Chore |
| Branch Strategy | Always `consolidation-pattern`, never `main` |
| Current Behavior | Code block showing the broken/missing state |
| Expected Behavior | Code block with the complete target implementation |
| Reproduction Steps | Numbered list — before and after applying the fix |
| Environment Details | Version, OS, runtime, tools |
| Files to create/modify | Table: File → Status → Action |
| Contributing Guide | Links to Contributing Guide and Git Guidelines |

### Acceptance criteria checklist (required for PRs)

```markdown
## Acceptance Criteria

- [ ] All existing tests pass (`pnpm test`)
- [ ] New handler has unit tests
- [ ] TypeScript — no `any` types
- [ ] No `NEXT_PUBLIC_*` prefix on server-only secrets
- [ ] Branch targets `consolidation-pattern`
- [ ] Commit message follows Conventional Commits
```

## Example title formats

```
feat(api): add idempotency service and tenant middleware — prevent double-deploy
fix(frontend): create DELETE /api/auth/role-cookie — replace broken document.cookie
refactor(api): migrate sync-user from JS to TypeScript — add Firebase verifyIdToken
chore(api): merge services/webhook into apps/api — Compute Resource Consolidation
docs(architecture): add system overview with Mermaid diagram
```

## Current Behavior block

Show the actual broken code — not a description of it:

```typescript
// ❌ SECURITY: No signature verification — forged token accepted
const payload = JSON.parse(
  Buffer.from(token.split(".")[1], "base64url").toString()
);
```

## Expected Behavior block

Show the complete implementation — contributors should be able to copy it:

```typescript
// ✅ Cryptographic verification — forged tokens rejected with 401
const decodedToken = await getAuth().verifyIdToken(idToken);
```

## Files table format

| File | Status | Action |
|---|---|---|
| `apps/api/src/services/idempotency.ts` | ❌ new | `checkIdempotency(engagementId)` |
| `apps/api/src/middleware/tenant.middleware.ts` | ✅ exists (stub) | Full validation logic |
| `apps/api/src/routes/escrow/deploy.handler.ts` | ✅ exists | Add idempotency check |
| `apps/api/src/index.ts` | ✅ exists | Register tenantMiddleware globally |