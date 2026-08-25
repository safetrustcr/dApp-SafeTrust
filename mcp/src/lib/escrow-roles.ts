import { PLATFORM_ADDRESS, USDC_ADDRESS } from '../config.js';

/**
 * SafeTrust's TrustlessWork role mapping, kept in one place so the
 * `explain-escrow-roles` tool and the architecture resource cannot drift apart.
 *
 * Source of truth: apps/api/src/routes/escrow/deploy.handler.js and
 * apps/frontend/src/app/api/escrow/deploy/route.ts.
 */
export function escrowRolesDoc(): string {
  const platform = PLATFORM_ADDRESS ?? '(unset — PLATFORM_STELLAR_ADDRESS / NEXT_PUBLIC_PLATFORM_ADDRESS)';

  return `# SafeTrust escrow role mapping (TrustlessWork single-release)

Deploying a rental-deposit escrow means POSTing to TrustlessWork
\`/deployer/single-release\` with these roles:

| TrustlessWork role | SafeTrust actor | Value sent |
|---|---|---|
| \`approver\` | Tenant (guest) | tenant Stellar wallet — signs the deploy and approves the milestone |
| \`serviceProvider\` | Owner (host) | owner Stellar wallet — provides the rental |
| \`receiver\` | Owner (host) | owner Stellar wallet — receives funds on release |
| \`platformAddress\` | SafeTrust platform | ${platform} |
| \`disputeResolver\` | SafeTrust platform | same platform wallet |
| \`releaseSigner\` | see note below | differs between the two deploy paths |

## Two deploy paths — they disagree on releaseSigner

- \`apps/api\` \`POST /api/escrow/deploy\` (deploy.handler.js) sets
  \`releaseSigner = tenantAddress\` and \`platformFee = PLATFORM_FEE_PERCENT ?? 1\`,
  and sends no trustline block.
- \`apps/frontend\` \`POST /api/escrow/deploy\` (route.ts) sets
  \`releaseSigner = platformAddress\`, \`platformFee = 0\`, and a
  \`trustline: { symbol: 'USDC', address: NEXT_PUBLIC_USDC_ADDRESS }\` block.

The \`deploy-escrow\` MCP tool calls the \`apps/api\` route, so it inherits the
tenant-as-releaseSigner behaviour. Flag this to a maintainer before relying on
release semantics — the two paths should converge.

## Database mapping (public.trustless_work_escrows)

| Column | Holds |
|---|---|
| \`marker\` | \`serviceProvider\` — owner/host wallet |
| \`approver\` | \`approver\` — tenant/guest wallet |
| \`releaser\` | \`releaseSigner\` — platform wallet |
| \`resolver\` | \`disputeResolver\` — platform wallet |

\`public.escrows\` (the newer single-release table) instead stores
\`sender_address\` = tenant wallet and \`receiver_address\` = owner wallet.

## Trustline

USDC on Stellar testnet — issuer \`${USDC_ADDRESS}\`
(\`NEXT_PUBLIC_USDC_ADDRESS\`).`;
}
