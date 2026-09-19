# Issue template and quality bar

This repository expects issues to be written in a consistent format so they are reviewable, testable, and easy to grade. The format below is the standard used for SafeTrust issues and is expected in contributor workflows, maintainer triage, and CodeRabbit review.

## 1) Required 8-section issue anatomy

Every issue should include all of the following sections:

1. Issue Summary
2. Type of Issue
3. Branch Strategy
4. Current Behavior
5. Expected Behavior
6. Reproduction Steps
7. Environment Details
8. Supporting Information

### Issue Summary
This is the most important section. It must explain the problem, the scope, and why it matters.

Good example:

```md
## Issue Summary
The escrow status banner on the guest dashboard does not refresh after a contract is funded. Users see stale status text even after the backend returns a successful funded state, which makes it unclear whether the deposit is active. This issue affects the booking-flow validation and blocks successful escrow review by contributors.
```

Bad example:

```md
## Issue Summary
Escrow is broken.
```

The bad version is too vague, does not describe the impact, and cannot be acted on by a reviewer or maintainer.

### Type of Issue
Label the issue cleanly.

```md
## Type of Issue
- Bug
- Feature
- Documentation
- Refactor
- Chore
```

### Branch Strategy
Always include the target branch and the expected branch naming pattern.

```md
## Branch strategy

```
✅ feat/issue-42-escrow-status-refresh → consolidation-pattern
```
```

### Current Behavior
Describe what happens today without speculation.

```md
## Current Behavior
The dashboard fetches the escrow record on page load, but the status label never re-renders after the funded event is received.
```

### Expected Behavior
Describe the desired end state precisely.

```md
## Expected Behavior
The status banner should update to the funded or active state as soon as the server returns the latest escrow data, and the UI should reflect the current contract lifecycle without a manual refresh.
```

### Reproduction Steps
Write step-by-step reproduction instructions.

```md
## Reproduction Steps
1. Start the local stack using the contributor setup.
2. Register a local test account with the DEV ONLY selector.
3. Create or open a booking with a funded escrow.
4. Trigger the contract-funding flow.
5. Observe the dashboard status banner.
```

### Environment Details
Include login state, app version, OS, browser, and generated/test environment details when relevant.

```md
## Environment Details
- OS: Windows 11
- Node: 20.x
- pnpm: 9.x
- Local stack: Hasura + Postgres + frontend + api
- Role: local dev account created via DEV ONLY selector
```

### Supporting Information
Attach screenshots, logs, mockups, links, or reproductions.

```md
## Supporting Information
- Screenshot of stale status banner
- Backend response payload showing `funded`
- relevant issue link
```

## 2) GrantFox A-rating criteria

Projects reviewed under GrantFox quality bar should include all of the following together:

| Criterion | Requirement |
|---|---|
| Clear problem statement | The issue describes the actual problem, not a guess. |
| Concrete scope | The work is bounded and reviewable. |
| Reproducible steps | The issue can be followed by another contributor. |
| Expected outcome | The desired behavior is spelled out. |
| Environment context | The issue includes app/runtime details needed to reproduce it. |
| Acceptance criteria | The issue lists a measurable finish condition. |

Issues that omit one or more of the above fail the quality bar and are likely to be returned for revision.

## 3) Issue title format

Issue titles should use this pattern:

```md
type(scope): description
```

Valid examples:

- `docs: write docs/contributing/setup.md — contributor workflow from fork to PR`
- `fix(api): escrow status updates after funding`
- `feat(frontend): add DEV ONLY role selector to registration flow`
- `docs: write docs/contributing/issue-template.md — issue anatomy and rubric`

Use the common types below:

- `feat` for new functionality
- `fix` for bug fixes
- `docs` for documentation
- `refactor` for code structure cleanup without behavior change
- `chore` for maintenance and tooling updates

## 4) Acceptance criteria checklist format

Every issue should end with a checklist like this:

```md
## Acceptance Criteria
- [ ] The issue contains all required sections.
- [ ] The problem is clearly described and scoped.
- [ ] The expected behavior is documented.
- [ ] Reproduction or validation steps are provided.
- [ ] The branch strategy matches the requested workflow.
- [ ] The fix or document is validated locally.
- [ ] The PR links this issue and targets `consolidation-pattern`.
```

## 5) What gets issues returned

Issues are likely to be returned for revision when they:

- omit required sections
- invent a problem without evidence
- use vague wording such as “broken” or “not working” without specifics
- are single-file trivial changes with no real context or validation
- do not include expected behavior or reproduction steps
- do not link to the relevant issue or branch strategy

The goal is not to write a long issue for the sake of length. The goal is to write an issue that another contributor can act on confidently and that a reviewer can validate quickly.

## 6) Review standard

Every issue should be written like a handoff: clear enough that a teammate can inspect it, understand the task, and continue without extra clarification. That is the standard required for GrantFox review and for CodeRabbit-assisted engineering quality.
