# Wave Methodology: SafeTrust Open-Source Operations

> **Documentation for contributors:** This guide explains how SafeTrust structures its open-source contribution waves, issue grading, and the sustainable contribution model using Drips, GrantFox, and OnlyDust platforms.

---

## Table of Contents

1. [Contribution Platforms](#contribution-platforms)
2. [Wave Structure](#wave-structure)
3. [Issue Grading & Point System](#issue-grading--point-system)
4. [Sleeve Issue Strategy](#sleeve-issue-strategy)
5. [GrantFox A-Rating Pattern](#grantfox-a-rating-pattern)
6. [Issue Template Anatomy](#issue-template-anatomy)
7. [CodeRabbit AI Integration](#coderabbit-ai-integration)
8. [Contributor Workflow](#contributor-workflow)

---

## Contribution Platforms

SafeTrust leverages three complementary platforms to fund and manage open-source work:

### **Drips Network** 💧
- **Purpose:** Time-based, continuous funding for projects and contributors
- **Model:** Funding streams that flow automatically over time
- **Advantage:** Sustainable, predictable income for long-term contributors
- **Use in SafeTrust:** Funds wave releases; contributors can set up recurring streams
- **Reference:** [drips.network](https://www.drips.network)

### **GrantFox** 🦊
- **Purpose:** Milestone-based grants with quality scoring
- **Model:** Issues are rated and paid upon completion; higher quality = higher rating
- **Scoring:** A, B, C ratings determine payout
- **Advantage:** Incentivizes high-quality, well-documented contributions
- **Use in SafeTrust:** Primary platform for issue payouts; A-rated issues are prioritized
- **Reference:** [grantfox.xyz](https://grantfox.xyz)

### **OnlyDust** (Optional)
- **Purpose:** Decentralized contribution marketplace
- **Model:** Bounty-based issue platform with DAO governance
- **Advantage:** Community-driven, transparent issue selection
- **Use in SafeTrust:** Alternative visibility and bounty posting (if enabled)
- **Reference:** [onlydust.com](https://www.onlydust.com)

**Key Difference:** Drips funds the *project*, GrantFox funds the *contributor*, OnlyDust provides *community discovery*.

---

## Wave Structure

SafeTrust organizes work into **waves** — discrete release cycles with defined scope, timeline, and point allocation.

### **Wave Timeline**

```
Wave Launch (Day 1)
  ├─ Issues batched and released
  ├─ Difficulty/point assignments published
  └─ Point reserve held back (sleeve issues)
       │
  Working Period (2-4 weeks typical)
       │
  Mid-Wave Release (Day 10-14)
       ├─ High-velocity contributors rewarded
       ├─ Sleeve issues released if velocity high
       └─ Maintains momentum
       │
  Wave Closure (Day 28-35)
       ├─ Final issues collected
       ├─ Quality review & CodeRabbit checks
       └─ GrantFox ratings assigned
       │
  Payouts (Day 35+)
       └─ Funds distributed via GrantFox
```

### **Point Values by Tier**

| Tier | Difficulty | Points | Time Estimate | Example |
|------|------------|--------|---------------|---------|
| 🟢 **Small** | Straightforward | 50-150 | 2-8 hours | Bug fix, docs, config |
| 🟡 **Medium** | Moderate complexity | 200-350 | 1-3 days | Feature, refactor, test suite |
| 🟠 **Large** | Complex multi-part | 400-600 | 3-7 days | API endpoint, migration, architecture |
| 🔴 **Epic** | Strategic/multi-team | 700+ | 1-2 weeks | Major feature, protocol change |

### **Wave Capacity**

- **Total Points Available:** ~2000-3000 per wave
- **Released Immediately:** 60% (~1200 points)
- **Sleeve Reserve:** 40% (~800 points, released mid-wave)
- **Velocity Trigger:** If 50%+ of immediate issues closed by Day 14, release sleeve issues

### **Typical Wave Breakdown**

```
Wave 7: SafeTrust Q3
├─ Small Issues (300 pts): 6 × 50pts
├─ Medium Issues (700 pts): 3 × ~230pts
├─ Large Issues (500 pts): 1 × 500pts
├─ SLEEVE RESERVE (500 pts):
│   ├─ Buffer for scope creep
│   ├─ Bonus quick-wins if velocity high
│   └─ Released mid-wave if conditions met
└─ Total: 2000 points
```

---

## Issue Grading & Point System

### **Grading Criteria**

Points are assigned based on:

1. **Complexity:** Code depth, dependencies, architectural knowledge required
2. **Scope:** Number of files touched, cross-module impact
3. **Testing:** How many tests must be added/modified
4. **Documentation:** Comments, README updates, schema changes
5. **Risk:** Potential for breaking changes, blockchain interactions

### **Complexity Scale**

| Level | Indicators | Points |
|-------|-----------|--------|
| **Level 1** | Single file, no tests, copy-paste fix | 50-100 |
| **Level 2** | 2-3 files, basic tests, isolated logic | 100-200 |
| **Level 3** | 4-6 files, moderate tests, cross-module | 200-350 |
| **Level 4** | 7+ files, extensive tests, multi-team | 400-600 |
| **Level 5** | Architecture change, protocol impact | 700+ |

### **Real-World Examples**

- **50 pts:** Fix typo in README, add missing env var comment
- **150 pts:** Add single utility function with tests, update docs
- **300 pts:** Implement GraphQL field with schema, resolver, tests
- **500 pts:** Add new API route with auth, DB schema, websocket support, full test coverage
- **800 pts:** Refactor auth system across frontend + backend + database layer

---

## Sleeve Issue Strategy

### **What are Sleeve Issues?**

**Sleeve issues** are high-quality, pre-prepared problems held in *reserve* — released mid-wave to maintain contributor momentum and handle scope changes.

### **Why Sleeve Issues Exist**

1. **Velocity Alignment:** Attracts fresh contributors if early momentum is high
2. **Scope Flexibility:** Absorbs unforeseen issues without re-grading
3. **Quality Control:** Extra time to polish issue descriptions, acceptance criteria
4. **Risk Mitigation:** Protects against unexpected blocker issues in primary batch
5. **Contributor Experience:** Contributors with high early velocity get rewarded with more work

### **Sleeve Issue Reserve Breakdown**

- **Total Wave Points:** 2000 (example)
- **Immediate Release:** 1200 points (60%)
- **Sleeve Reserve:** 800 points (40%)
  - 500 pts: High-confidence issues (polished, tested acceptance criteria)
  - 300 pts: Optional scope (nice-to-have features, backlog items)

### **Release Conditions**

**Sleeve issues are released when:**

```
(Closed Issues / Total Released Issues) > 50% 
AND 
Days Into Wave >= 10
```

**Example:**
- Released: 8 issues initially
- After Day 10: 4 issues closed
- 4/8 = 50% → Sleeve issues auto-released

### **Contributor Benefit**

Contributors who finish early and want more work:

1. Post in wave thread: "Looking for more issues"
2. Maintainer releases from sleeve batch
3. Extra points count toward wave totals
4. Faster GrantFox A-rating potential

---

## GrantFox A-Rating Pattern

### **The A-Rating Formula**

GrantFox's algorithm rates contributions on:

- **Code Quality:** Tests, documentation, clean commits
- **Communication:** PR description clarity, responsiveness to review
- **Scope Alignment:** Solves stated problem completely
- **Timing:** On-schedule completion

SafeTrust contributors consistently earn **A ratings** by following this pattern:

### **1. Real Measured Problem**

**Before/After Numbers:**

```
Bad: "Optimize database queries"
Good: "Reduce query latency by 40% (2.1s → 0.6s) for tenant dashboard load"
```

Add metrics to issue description:
- Baseline measurement with timestamp/commit
- Target improvement
- User impact (faster page load, lower API cost, etc.)

### **2. Multi-Language Rationale**

When applicable, explain the problem in multiple contexts:

- **Rust** (if TrustlessWork SDK involved): "Contract size reduced by 12%"
- **TypeScript** (backend): "Hasura resolver time down 300ms per query"
- **Next.js** (frontend): "LCP improved from 3.2s to 1.8s"
- **SQL** (database): "Index on `escrow_state, created_at` eliminates full table scan"

### **3. Security / Blockchain-Native Reasoning**

For Stellar/blockchain-related work:

- Cite security implications: "Prevents double-spend if..."
- Explain on-chain impact: "Reduces XDR size by X bytes per transaction"
- Link to relevant docs: "[TrustlessWork XDR signing](https://docs.trustlesswork.com)"

### **4. Zero-Breaking-Change with Env-Var Gates**

**Pattern:** Always support old + new behavior behind feature flags:

```typescript
// Good: Gradual rollout
const useNewQueryStrategy = process.env.NEXT_PUBLIC_NEW_QUERY_STRATEGY === 'true';

if (useNewQueryStrategy) {
  // New optimized path
  results = await optimizedQuery(filters);
} else {
  // Legacy path (always works)
  results = await legacyQuery(filters);
}
```

**GrantFox loves this:** Zero risk, verifiable rollback, safe production testing.

### **5. Tests Updated Alongside Implementation**

**Requirement:** Every PR must have tests, added in the same commit:

```
❌ 1 commit: Add feature
✅ 1 commit: Add feature + tests
```

Test coverage expectations:
- Happy path (feature works)
- Edge cases (boundary conditions)
- Rollback path (old behavior still valid)
- Integration (feature + other systems)

### **6. Timing Data in PR Descriptions**

Add execution time measurements:

```markdown
## Performance Impact

- Query time: 2100ms → 600ms (71% improvement)
- Memory allocation: 45MB → 12MB (73% reduction)
- XDR size: 3.2KB → 2.8KB (12% reduction)
- Zero new dependencies added

Tested with 10K+ records. Rollback plan: Set NEXT_PUBLIC_NEW_QUERY_STRATEGY=false
```

### **A-Rating Checklist**

Before submitting PR, verify:

- [ ] Real measured problem (before/after numbers)
- [ ] Multi-language rationale (if applicable)
- [ ] Security/blockchain implications stated
- [ ] Env-var gate for gradual rollout
- [ ] Tests added (>80% coverage for changes)
- [ ] Timing data in PR description
- [ ] Rollback plan documented
- [ ] No breaking changes to public APIs
- [ ] Commit messages reference issue #

**Result:** GrantFox A-rating → maximum payout + reputation boost.

---

## Issue Template Anatomy

Every SafeTrust issue **must** include these **8 sections** for consistency and contributor clarity:

### **Template Structure**

```markdown
# [Prefix] Brief Title

**Objective:** One sentence defining the goal.

## Problem Statement
Context: What's broken, slow, or missing?
Why: Who needs this, and when?
Impact: Quantify the issue (performance, user experience, risk)

## Acceptance Criteria
- [ ] A/B testable requirement
- [ ] C/D testable requirement
- [ ] E/F testable requirement

## Technical Approach
Suggested implementation path (not required, guidance only)

## Testing Requirements
- Unit tests: X should do Y
- Integration tests: Z should work with W
- Manual testing: Steps to verify in staging

## Dependencies
- Related issues: #123, #456
- Blocked by: (if any)
- Blocks: (if any)
- Required knowledge: GraphQL, Stellar XDR, etc.

## Points & Tier
- **Tier:** Small 🟢 / Medium 🟡 / Large 🟠 / Epic 🔴
- **Points:** 150
- **Estimated Time:** 4-6 hours

## Deliverables
- Code merged to `develop`
- Tests passing (>80% coverage)
- PR description includes before/after metrics
- (Optional) Documentation updated
```

### **Example: Real SafeTrust Issue**

```markdown
# [API] Optimize escrow query latency on tenant dashboard

**Objective:** Reduce Dashboard `getEscrowsByStatus` query time by 60%.

## Problem Statement
The tenant dashboard loads all escrow records for a user, causing:
- Page load time: 3.2s (LCP > 3s = poor CWV)
- Hasura resolver: 2.1s
- Network usage: unnecessary full escrow schema
- User complaints in Discord: "Dashboard is slow"

**Impact:** Affecting 200+ daily active users; bounce rate on dashboard +15%

## Acceptance Criteria
- [ ] Query latency <0.6s (measured with `console.time`)
- [ ] LCP <2.5s on Dashboard route
- [ ] Still works for users with 500+ escrow records
- [ ] Maintains pagination support

## Technical Approach
1. Add `pagination_limit: 20` to GraphQL query
2. Add composite index on `(tenant_id, updated_at DESC)`
3. Fetch only necessary fields: `id, status, amount, created_at`
4. Gate behind `NEXT_PUBLIC_OPTIMIZED_ESCROW_QUERY=true`

## Testing Requirements
- Unit: Query factory returns correct fields
- Integration: Dashboard with 1000 test records loads <0.7s
- Manual: Load dashboard in staging, measure LCP with DevTools

## Dependencies
- Requires DB migration: `add_escrow_tenant_index` (separate issue)
- Related to #234 (tenant filtering)

## Points & Tier
- **Tier:** Medium 🟡
- **Points:** 250
- **Estimated Time:** 6-8 hours

## Deliverables
- [ ] PR merged with tests
- [ ] Performance benchmark in PR description
- [ ] Rollback plan (disable NEXT_PUBLIC_OPTIMIZED_ESCROW_QUERY)
- [ ] Dashboard docs updated with new query shape
```

---

## CodeRabbit AI Integration

SafeTrust uses **[CodeRabbit](https://coderabbit.ai)** for automated code review. Understand how it works and respond professionally.

### **What CodeRabbit Checks**

CodeRabbit is configured to lint PRs for:

| Category | Examples | What to Do |
|----------|----------|-----------|
| **Code Quality** | Unused imports, unreachable code, console.log left in | Remove/fix automatically |
| **Testing** | Missing test cases, low coverage, untested branches | Add tests before merge |
| **Security** | Hardcoded secrets, SQL injection risk, XSS vectors | Address before merge |
| **Performance** | N+1 queries, unnecessary re-renders, large bundles | Optimize per suggestion |
| **Best Practices** | Const vs let, error handling, async/await | Follow suggestion |
| **Blockchain-Specific** | Unvalidated XDR, unsafe Stellar operations | Critical: must fix |

### **CodeRabbit Comment Format**

```
🤖 CodeRabbit
Suggested change in src/api/routes/escrow.ts

Line 42: Unused variable `tempAmount`
- Remove or use the variable
```

### **How to Respond**

**Option 1: Accept the Suggestion**
- Click "Apply suggestion" → Commit is added automatically
- Maintainer sees change and can approve

**Option 2: Acknowledge & Explain**
```
@CodeRabbit Thanks for catching this. I'm keeping `tempAmount` for clarity
in the next PR (#XXX). For now, I've wrapped it in a TODO comment.
```

**Option 3: Disagree (Rare)**
```
@CodeRabbit This is a false positive because [explain reason].
The pattern is intentional for [X reason].
```

### **CodeRabbit Best Practices**

1. **Don't ignore warnings** — especially security/blockchain ones
2. **Read the explanation** — often suggests better patterns
3. **Use "Apply suggestion"** if you agree — faster than manual edits
4. **Comment if unclear** — maintainer will help decide
5. **Block merge on red flags** — security/blockchain issues must be resolved

### **Configuration**

CodeRabbit settings in SafeTrust:

```yaml
# .coderabbit.yaml (if exists)
rules:
  - blockchain: enabled       # Stellar XDR checks
  - performance: enabled      # Query optimization
  - security: enabled         # Secret detection
  - testing: required         # >80% coverage mandate
  - typescript: strict        # No `any` type
ignore_patterns:
  - "**/*.md"                 # Docs skip review
  - "node_modules/**"         # Dependencies skip review
```

---

## Contributor Workflow

### **Step-by-Step: From Issue to Merged PR**

**Phase 1: Claim & Prepare (Day 1)**

1. Find wave issue on GrantFox or GitHub Issues
2. Comment: `I'll take this` (claims the issue)
3. Ask clarifying questions if needed (within 24 hours)
4. Maintainer assigns you

**Phase 2: Develop (Days 2-5)**

1. Create branch: `git checkout -b docs/issue-N-wave-methodology`
2. Follow code structure in [Backend](../backend/api-routes.md) / [Frontend](../frontend/README.md) docs
3. Implement feature (or write docs)
4. Add tests alongside code
5. Commit message format: `fix/feat: issue title (#N) — brief summary`

**Phase 3: Quality Check (Day 5-6)**

1. Push to GitHub → PR auto-opens
2. CodeRabbit review runs automatically
3. Address CodeRabbit comments:
   - Click "Apply suggestion" for easy fixes
   - Discuss if you disagree
4. Run tests locally: `pnpm test`
5. Self-review: PR description includes before/after metrics

**Phase 4: Review & Merge (Day 6-7)**

1. Maintainer reviews code + tests
2. Final approval when:
   - All tests passing (>80% coverage)
   - CodeRabbit comments addressed
   - PR description complete
3. Squash & merge to `develop`

**Phase 5: Payout (Day 7+)**

1. Link PR to GrantFox issue
2. GrantFox auto-rates: A/B/C
3. Funds transfer to wallet (typically within 48 hours)

### **Common Commands**

```bash
# Setup: First time only
git clone https://github.com/safetrustcr/dApp-SafeTrust
cd dApp-SafeTrust
pnpm install

# Create feature branch
git checkout -b docs/issue-N-wave-methodology
# Always branch from `develop`

# Run tests
pnpm test

# Commit with issue reference
git commit -m "docs: write wave methodology guide (#373)"

# Push to GitHub (triggers PR)
git push origin docs/issue-N-wave-methodology

# After merge, clean up local
git checkout develop
git pull origin develop
git branch -d docs/issue-N-wave-methodology
```

### **Getting Help**

- **Issue unclear?** Comment on GitHub issue → Maintainer responds within 24h
- **Stuck on implementation?** Post in Discord #dev-questions
- **CodeRabbit confusion?** Ask maintainer in PR comments
- **Design question?** Post in Discord #architecture

---

## Summary: Your Path to A-Rating

```
1. Pick issue with real measured problem + clear acceptance criteria
   ↓
2. Implement with env-var gate (zero breaking changes)
   ↓
3. Add tests (>80% coverage) + before/after metrics
   ↓
4. Address CodeRabbit comments (security/performance first)
   ↓
5. PR description includes timing data + rollback plan
   ↓
6. Merge & link to GrantFox
   ↓
7. A-rating → Maximum payout ✨
```

---

## References

- **Drips Network:** https://www.drips.network
- **GrantFox:** https://grantfox.xyz
- **OnlyDust:** https://www.onlydust.com
- **TrustlessWork Docs:** https://docs.trustlesswork.com
- **Stellar Docs:** https://developers.stellar.org
- **CodeRabbit:** https://coderabbit.ai
- **SafeTrust Contributing Guide:** [Contributing Guide](./CONTRIBUTING.md)
- **SafeTrust Git Guidelines:** [Git Guidelines](./GIT_GUIDELINES.md)

---

**Last Updated:** 2026-08-31  
**Maintained by:** SafeTrust Core Team  
**Questions?** Ask in Discord `#dev-questions` or open an issue.
