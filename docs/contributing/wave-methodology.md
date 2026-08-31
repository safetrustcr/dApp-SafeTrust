# Wave Methodology

This document describes how SafeTrust runs open-source contribution waves. It covers the three platforms we participate in, how issues are graded and released, the sleeve issue reserve strategy, the GrantFox A-rating pattern, the canonical issue template anatomy, and how CodeRabbit AI review fits into the workflow.

---

## 1. Contribution platforms

SafeTrust participates in three complementary contribution ecosystems. Each serves a different purpose in the contributor journey.

### Drips Network (Wave)

Drips Wave is the primary structured contribution channel. It runs synchronized, time-boxed sprints — typically one week per month — where maintainers scope issues in advance and contributors earn Points for merged PRs. SafeTrust is part of the Stellar Wave Program. Points translate into a share of the Wave reward pool at the end of each cycle.

- **Role**: structured sprint, predictable schedule, point-based rewards.
- **Contribution flow**: maintainers tag issues with a complexity level → contributors apply via the Wave dashboard → PRs are reviewed and merged → points are awarded on resolution.
- **When to use**: all scoped issues that fit the Wave cycle.

### GrantFox

GrantFox is an open-source contribution ecosystem that connects projects with contributors through campaigns and bounties. It emphasizes reputation building, transparent collaboration, and structured campaign windows.

- **Role**: reputation and discovery layer; longer-running campaigns outside the strict Wave timebox.
- **Contribution flow**: contributors browse campaigns, apply to issues, ship PRs, and receive reviews/ratings that build a verifiable track record.
- **When to use**: issues that benefit from extended visibility or campaigns that run over multiple weeks.

### OnlyDust

OnlyDust provides grant-based and event-based open-source funding. Its "Open Source Week" model is a 10-day hackathon-style sprint with high energy and visible project promotion.

- **Role**: event-driven funding and elite-developer matching.
- **Contribution flow**: maintainers register projects, publish issues during Open Source Week or through ongoing grants, contributors apply, and rewards are processed post-event.
- **When to use**: one-off grants, hackathon-style events, or when we want to attract elite contributors for complex tasks.

### How they differ

| Platform | Cadence | Reward model | Best for |
|---|---|---|---|
| Drips Wave | Monthly 1-week sprint | Points → reward pool share | Predictable backlog clearing |
| GrantFox | Campaign windows | Bounties + reputation | Extended visibility, reputation |
| OnlyDust | Open Source Week / grants | Grants + XP/badges | Elite contributors, complex work |

---

## 2. Wave structure

### Lifecycle

A Wave follows three phases:

1. **Scoping** — maintainers add issues to the Wave Program and assign a complexity level. SafeTrust issues are tagged with `Stellar Wave` on GitHub. Complexity determines point value:
   - **Trivial**: 100 points (typos, small bug fixes).
   - **Medium**: 150 points (standard features, involved bug fixes).
   - **High**: 200 points (complex architecture, refactors, new integrations).

2. **The Sprint** — the Wave opens for contributors. They browse issues, submit applications, and open PRs. Each resolved issue awards points and pushes the contributor up the leaderboard.

3. **Reward** — once the Wave closes, the total reward budget is distributed by each contributor's share of total points earned.

### Timeline

- **Pre-wave (T minus 1 week)**: maintainers finalize the issue queue, set complexity levels, and publish to the Wave dashboard.
- **Wave open (7 days)**: contributors apply, build, and submit PRs.
- **Review window**: maintainers review PRs, request changes, and merge. Points are issued when the issue is marked resolved.
- **Payout**: after the Wave ends, rewards are distributed on-chain to registered contributor wallets.

---

## 3. Sleeve issue strategy

Sleeve issues are high-value issues held in reserve at the start of a Wave. They are not published on day one. Instead, they are released mid-wave — typically on day 3 or 4 — to sustain contributor momentum and reward top performers.

### Why sleeve issues exist

- **Prevent front-loading**: if all high-point issues are visible on day one, contributors may burn out or slow down after the initial rush.
- **Mid-wave energy spike**: releasing new issues re-engages the leaderboard and gives late-joining contributors a fair shot at high-value work.
- **Quality gate**: sleeve issues are typically more complex or security-sensitive. Holding them back lets maintainers gauge the general quality of early-wave contributions before opening high-stakes work.

### When they are released

- Released after the first 40–50% of the Wave window has elapsed.
- Typically 1–3 sleeve issues per repo per Wave.
- Announcement is made in the Wave dashboard and the repo's Discord/community channel.

---

## 4. GrantFox A-rating pattern

GrantFox reviews contributors after each merged PR. An A-rating is not accidental — it follows a repeatable pattern derived from SafeTrust's actual review history.

### Criteria

1. **Real measured problem** — the PR description includes before/after numbers. Not "improved performance" but "reduced query time from 2.4s to 320ms on the escrow list endpoint." Benchmarks, load test results, or concrete metrics are required.

2. **Multi-language rationale** — when a change spans Rust and TypeScript (or any two layers), the PR explains why both sides needed modification. Reviewers reward contributors who demonstrate cross-stack understanding rather than treating the change as two unrelated patches.

3. **Security/blockchain-native reasoning** — SafeTrust runs on Stellar. PRs that touch escrow flows, XDR handling, or TrustlessWork integration must address security implications: unsigned XDR validation, session variable correctness, tenant isolation in Hasura, and replay/tampering risks.

4. **Zero-breaking-change with env-var gates** — new behavior is introduced behind environment variables. Existing deployments continue to work without config changes. This is explicitly checked in the PR diff and CI.

5. **Tests updated alongside implementation** — unit tests, integration tests, or E2E tests are not deferred. The PR includes test changes that match the implementation scope.

6. **Timing data in PR descriptions** — ETA vs. actual completion time, or cycle-time metrics, are included in the PR body. This feeds back into the maintainers' own Wave planning.

### How contributors earn A-ratings

- Include the six criteria above in every PR.
- Respond to reviewer comments within the Wave window.
- Link the Drips/GrantFox issue number in the PR description.
- Keep commits atomic and aligned with the Git Guidelines.

---

## 5. Issue template anatomy

Every SafeTrust issue follows an 8-section template. Consistent structure lets contributors self-serve and lets maintainers review faster.

1. **Issue Summary** — one paragraph: what is being built and why it matters. Include the platform label (`Stellar Wave`) and point value if the issue is in an active Wave.

2. **Current Behavior** — what exists today, with code references, screenshots, or API responses. Set the baseline so the reviewer can verify the fix.

3. **Expected Behavior** — the desired end state. Specific enough that a contributor can confirm completion without asking maintainers.

4. **Acceptance Criteria** — checkbox list split into Must Have / Should Have / Nice to Have. The Must Have list is the minimum merge condition.

5. **Technical Requirements** — files to create or modify, component structure, API endpoints to integrate, and any environment variables or configuration changes.

6. **Testing Requirements** — unit tests, integration tests, E2E tests, or manual verification steps. Include expected outcomes.

7. **Priority Justification** — why this work matters now. Is it blocking a Wave? A security requirement? A frontend dependency?

8. **Environment Details** — project version, file locations, dependencies, integration points, and any setup steps a contributor needs before running the code.

---

## 6. CodeRabbit AI

CodeRabbit is configured as an automated code review bot on SafeTrust repositories. It runs on every PR and provides an initial review pass before a human maintainer looks at the change.

### Configuration

CodeRabbit behavior is controlled by a `.coderabbit.yaml` file at the repository root. Key settings used across SafeTrust repos:

- **Profile**: `chill` — balanced feedback, not overly nitpicky.
- **Auto review**: enabled on all non-draft PRs targeting the default branch.
- **Incremental review**: re-runs on each push, focusing on new commits.
- **High-level summary**: generates a summary of changes in the PR description.
- **Path instructions**: file-specific guidance (e.g., flag any SQL that drops or truncates tables).

### What it checks

- Security patterns (hardcoded secrets, SQL injection risks).
- Consistency with repository conventions (naming, error handling, TypeScript strictness).
- Completeness of PR descriptions and linked issues.
- Test coverage gaps for new or modified code paths.
- Blockchain-specific concerns in escrow-related files (XDR handling, env-var usage).

### How contributors should respond

- **Read the comments before asking for human review**. CodeRabbit catches formatting, naming, and obvious security issues first.
- **Fix legitimate findings** and push a new commit. CodeRabbit will re-review incrementally.
- **Disagree with a suggestion** by replying directly in the PR comment thread with a short rationale. Do not dismiss comments silently.
- **Do not mark CodeRabbit comments as resolved** unless you have addressed the underlying issue. Maintainers review the full thread before merging.
- **Trigger a manual review** with `@coderabbitai review` if you want an incremental pass after a significant update, or `@coderabbitai full review` for a complete re-scan.
