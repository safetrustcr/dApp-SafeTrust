# SafeTrust Documentation

SafeTrust is a decentralized P2P escrow platform for rental and hospitality
transactions built on the Stellar blockchain via TrustlessWork API.

## Navigation

### Architecture
- [System Overview](./architecture/overview.md)
- [Data Model](./architecture/data-model.md)
- [Escrow Lifecycle](./architecture/escrow-lifecycle.md)
- [Multi-Tenant Design](./architecture/multi-tenant.md)
- [Applied Patterns, Layers, and Decision Filters](./architecture/design-pattern-filters.md)

The pattern guide maps observed SafeTrust implementations to their reasons and
data layers, distinguishes GoF categories from architectural orchestration, and
explains booking conditionals, test coverage, and compute consolidation.
Mermaid diagrams show [pattern ownership across layers](./architecture/design-pattern-filters.md#architecture-and-pattern-ownership),
the [booking orchestration flow](./architecture/design-pattern-filters.md#booking-orchestrator-scope-and-data-flow),
and the [pattern selection filters](./architecture/design-pattern-filters.md#applying-the-selection-filters).

### Stellar Integration
- [TrustlessWork API](./stellar/trustlesswork.md)
- [Soroban Smart Contracts](./stellar/soroban.md)
- [x402 Agentic Payments](./stellar/x402.md)

### Backend
- [API Routes Reference](./backend/api-routes.md)
- [Authentication Flow](./backend/auth-flow.md)
- [Hasura Schema](./backend/hasura-schema.md)

### Frontend
- [Frontend Architecture](./frontend/architecture.md)
- [Wallet Integration](./frontend/wallet-integration.md)

### Infrastructure
- [Bootstrap Guide](./infra/bootstrap.md)
- [Docker Compose](./infra/docker.md)

### Contributing
- [Local Setup](./contributing/setup.md)
- [Wave Contribution Methodology](./contributing/wave-methodology.md)
- [Issue Template Guide](./contributing/issue-template.md)

### Roadmap
- [Milestones](./roadmap/milestones.md)
- [SCF Build Award](./roadmap/scf-build-award.md)

## Quick links

- [GitHub](https://github.com/safetrustcr)
- [TrustlessWork Docs](https://docs.trustlesswork.com)
- [Stellar Docs](https://developers.stellar.org)
