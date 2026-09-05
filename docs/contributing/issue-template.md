# Issue Template & Writing Guide

To maintain high technical quality across **SafeTrust**, all GitHub issues submitted by contributors, maintainers, or wave participants must adhere to the mandatory 8-section issue template. Well-structured issues ensure rapid triage, seamless review by CodeRabbit, and high compliance with **GrantFox A-rating** criteria.

---

## 1. Issue Title Format

Issue titles must follow the conventional commit specification:

```text
<type>(<scope>): <short description>
```

### Valid Types & Examples

| Type | Purpose | Example |
|---|---|---|
| `feat` | New user-facing functionality | `feat(escrow): add automated dispute resolution workflow` |
| `fix` | Bug fix | `fix(auth): handle expired Firebase session tokens gracefully` |
| `docs` | Documentation updates | `docs(contributing): write setup.md guide` |
| `refactor` | Code restructuring without feature/fix change | `refactor(hasura): consolidate GraphQL query definitions` |
| `test` | Adding or updating tests | `test(webhook): add integration tests for Stellar transaction listener` |
| `chore` | Build tasks, package updates, maintenance | `chore(deps): update Turborepo configuration` |
| `ci` | CI/CD workflow changes | `ci(actions): add automated type-check action` |
| `style` | Formatting or styling updates | `style(ui): align card paddings across dashboard` |
| `perf` | Performance optimizations | `perf(api): cache GraphQL query execution plans` |

---

## 2. Mandatory 8-Section Issue Structure

Every issue must include all 8 of the following sections:

1. **Issue Summary**: A concise summary of the problem and technical scope.
2. **Type of Issue**: Documentation, Feature, Bug Fix, Refactor, Infrastructure, etc.
3. **Branch Strategy**: Target branch and branch naming pattern (e.g. `docs/issue-382-contributor-setup → consolidation-pattern`).
4. **Current Behavior**: Detailed description of what is currently happening in the codebase.
5. **Expected Behavior**: Detailed description of what should happen after implementation.
6. **Reproduction Steps**: Step-by-step instructions to reproduce the behavior or verify context.
7. **Environment Details**: Node version, OS, browser, database state, or framework versions.
8. **Supporting Information**: References to relevant code files, documentation links, or error logs.

---

## 3. Section Explanations & Examples

### Section 1: Issue Summary (Good vs. Bad)

#### ❌ Bad Issue Summary
> "The register page is broken and roles don't work right."
> *Why it fails*: Vague, lacks context, omits scope, and provides no technical specifics.

#### ✅ Good Issue Summary
> "The user registration flow in `apps/frontend/src/app/register/page.tsx` fails to propagate the selected role to Hasura GraphQL during account creation. When a user selects 'Landlord' in the DEV ONLY role selector, the user record is written to the database with a default role of 'Tenant', causing permission errors when attempting to create property listings."
> *Why it passes*: Specific, identifies files involved, details exact behavior, and describes technical impact.

### Section 2 & 3: Type of Issue & Branch Strategy Example

```markdown
## Type of Issue
Documentation

## Branch Strategy
docs/issue-382-contributor-setup → consolidation-pattern
```

### Section 4 & 5: Current vs. Expected Behavior Example

```markdown
## Current Behavior
The setup documentation is missing, causing new contributors to struggle with environment setup, backend bootstrapping, and test account creation.

## Expected Behavior
A detailed setup guide located at `docs/contributing/setup.md` covering the full developer workflow from fork to PR.
```

---

## 4. GrantFox A-Rating Criteria

To receive a **GrantFox A-Rating**, an issue must meet all 6 of the following criteria simultaneously:

| Criteria | Description |
|---|---|
| **1. Clear & Concise Problem Statement** | Unambiguous explanation of what problem exists and why it needs fixing. |
| **2. Well-Defined Scope & Boundaries** | Clear delimitation of modified files, packages, and technical boundaries. |
| **3. Reproducible Context** | Exact reproduction steps or concrete context reproducing the current state. |
| **4. Acceptance Criteria Checklist** | Explicit checklist format (`- [ ]`) specifying verifiable done state. |
| **5. Standard Branch Strategy** | Valid branch source and target specification (`branch → consolidation-pattern`). |
| **6. No Trivial or Invented Problems** | Resolves real, non-trivial needs without artificial scope padding. |

---

## 5. Acceptance Criteria Checklist Format

Every issue must end with an explicit **Acceptance Criteria** checklist using standard Markdown checkboxes:

```markdown
## Acceptance Criteria

- [ ] All 8 issue sections are present and fully populated.
- [ ] DEV ONLY role selector correctly assigns selected role during registration.
- [ ] TypeScript typecheck (`pnpm run check-types`) passes cleanly with zero errors.
- [ ] Automated tests cover the new user role assignment handler.
- [ ] CodeRabbit review feedback has been addressed satisfactorily.
```

---

## 6. What Gets Issues Returned

Issues submitted to SafeTrust will be rejected or returned for revision if they contain any of the following flaws:

- **Missing Required Sections**: Omitting any of the mandatory 8 sections.
- **Invented Problems**: Fabricating fictional bugs or unnecessary abstractions that do not exist in the codebase.
- **Single-File Trivial Changes**: Submitting trivial issues for fixing single-word typos, minor comment edits, or whitespace changes.
- **Missing Acceptance Criteria**: Failing to include a verifiable checkbox list at the end of the issue.
- **Invalid Branch Strategy**: Not specifying `consolidation-pattern` as the target branch.
