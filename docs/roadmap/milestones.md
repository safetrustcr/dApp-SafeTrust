# SafeTrust Roadmap and Milestones

This roadmap tracks the SafeTrust consolidation milestone and the next delivery gates toward a production-ready escrow network. The milestones are aligned to the mainnet readiness review process and mapped to the contribution and funding channels currently active for the project.

## Executive summary

The current consolidation track is focused on shipping the escrow MVP as a stable, single-source foundation before expanding into security hardening, x402 execution flows, and AI-assisted workflows.

- Phase 1 — Escrow MVP: target date September 30, 2026
- Phase 1.5 — Security: target date October 31, 2026
- Phase 2 — x402 + Mainnet: target date December 31, 2026
- Phase 3 — AI Workflows: target date March 31, 2027

Each phase produces a concrete artifact set that supports both contributor delivery and SCF review scoring for mainnet readiness.

---

## Phase 1 — Escrow MVP (Sep 30, 2026)

This is the consolidation milestone. The goal is to complete the core escrow stack as a coherent platform with a single operational model for onboarding, wallet flows, escrow lifecycle management, and deployment readiness.

### Open issues for the consolidation milestone

| Issue / workstream | Status | Notes |
| --- | --- | --- |
| Consolidate escrow API and backend service boundaries | In progress | Shared routing, tenant-aware middleware, and escrow state handling are being normalized around a single flow. |
| Merge auth and tenant middleware into a common security gate | In progress | Ensures token validation, request scoping, and access control are consistent across endpoints. |
| Complete escrow DB + Hasura integration cleanup | In progress | Covers milestone tracking, contract linkage, and deterministic DB state updates. |
| Stabilize frontend escrow flow for host / guest actions | In progress | Includes create, fund, milestone approval, release, and status visibility. |
| Review and close all known MVP reliability gaps | Open | Focused on payload validation, error handling, and test coverage before the Phase 1 cutoff. |
| Document operational runbooks and environment setup | Open | Required for contributor onboarding and audit readiness. |
| Prepare SCF milestone review package | Planned | Maps the consolidation milestone to mainnet gating criteria for reviewers. |

### Definition of Done for the consolidation milestone

The consolidation milestone is complete only when all of the following are true:

- [ ] The escrow MVP is fully consolidated around a single architecture and service model for deployment, funding, milestone approval, and release.
- [ ] Authentication and tenant enforcement are consistent across all API routes, including the secure validation of identity and authorization context.
- [ ] Hasura and database layers are stable and compatible with the escrow lifecycle, including milestone state transitions and contract-linked records.
- [ ] Frontend user flows for host and guest actions are working end-to-end with the live backend and escrow logic.
- [ ] Security hardening requirements for the MVP are implemented or explicitly tracked in Phase 1.5 for completion before mainnet deployment.
- [ ] Automated tests and smoke checks cover the core flows required for escrow creation, updates, and release operations.
- [ ] The milestone is documented, reviewed, and ready for SCF scoring against the mainnet readiness checklist.

### Phase 1 expected result

By September 30, 2026, SafeTrust should have a working escrow MVP that is contributor-friendly, deployable from the consolidated branch, and ready for a disciplined security and compliance hardening pass.

---

## Phase 1.5 — Security (Oct 31, 2026)

This phase closes the security gap between the MVP and mainnet readiness. It focuses on enforcing identity trust, reducing operational risk, and making the platform compliant with modern backend security expectations.

### Deliverables

- Firebase Admin everywhere for server-side identity verification and protected operations.
- JWKS middleware for validating provider-issued tokens and maintaining consistent auth trust boundaries.
- TypeScript migration complete across the backend and app layers that are part of the live trust path.
- Hasura JWT configuration aligned with the project’s identity and auth model.
- Security review and hardening of API routes, middleware, secrets handling, and deployment scope.

### Phase 1.5 expected result

SafeTrust moves from a working MVP to a hardened production-ready core. The platform reaches a level where contributors can safely expand the protocol and where SCF reviewers can evaluate the project on a stronger trust and security baseline.

---

## Phase 2 — x402 + Mainnet (Dec 31, 2026)

This phase expands SafeTrust from escrow execution toward networked utility and on-chain settlement readiness. The main objective is to reach a mainnet-ready platform that supports modern payment rails and verifiable user trust signals.

### Deliverables

- x402 middleware integrated into the platform to support modern web-native payment patterns.
- Pollar complete as part of the rewards, verification, or coordination layer required for network operations.
- USDC mainnet integration and operational settlement flow.
- ZK proof-of-funds support for higher-trust transaction and compliance checks.
- Full mainnet readiness review for the escrow platform, including migration, ops, and audit artifacts.

### Phase 2 expected result

SafeTrust becomes a mainnet-capable platform with stronger financial rails, compliance posture, and transaction integrity. Milestone scoring at this stage is driven by readiness for production deployment rather than feature breadth alone.

---

## Phase 3 — AI Workflows (Mar 31, 2027)

This phase adds intelligence and automation while preserving accountability and human oversight. The platform should remain secure, auditable, and human-governed as it expands into agent-driven workflows.

### Deliverables

- Human-in-the-loop validation for sensitive automation flows.
- Full MCP agent support for cross-platform operational orchestration.
- Multi-jurisdiction deployment readiness for expanded regional and legal operations.
- Review and governance model for AI-assisted actions, especially in finance and identity-sensitive flows.

### Phase 3 expected result

SafeTrust becomes a compliance-aware, AI-enabled escrow platform with strong human controls, reproducible workflows, and multi-region operational capability.

---

## Branch status

| Branch | Role | Status | Notes |
| --- | --- | --- | --- |
| consolidation-pattern | Default branch / contributor working branch | Active | Primary branch for milestone delivery, consolidation work, and ongoing development. |
| main | Maintainer backup / release branch | Backup | Reserved for maintainers and migration-safe reference state. |

The branch strategy keeps day-to-day contributor work on `consolidation-pattern` while preserving `main` as the stable maintainer checkpoint.

---

## Contribution platform status

| Platform | Status | Note |
| --- | --- | --- |
| Drips Wave 8 | Active | Funding and ecosystem support is active for the SafeTrust contributor pipeline. |
| GrantFox | Active | Public grant and funding path for project support and ongoing visibility. |
| OnlyDust | Active | Contributor-driven support channel for open workstreams and community participation. |
| SCF #46 | In review / milestone-mapped | SCF reviewers score the milestones against mainnet readiness and delivery quality. |

### SCF scoring signal

The SCF review process is tied to milestone readiness, not only feature completion. Reviewers evaluate whether each phase demonstrates real operational progress, security maturity, and mainnet feasibility before advancing the project.

---

## Current milestone position

SafeTrust is presently centered on the consolidation milestone and the transition into the security hardening phase. The roadmap currently prioritizes:

1. stable escrow MVP delivery,
2. end-to-end security strengthening,
3. mainnet readiness through x402 and USDC flows,
4. AI workflow expansion under human oversight.

This keeps the platform grounded in essential infrastructure while preserving a clear path toward decentralized, production-scale operations.
