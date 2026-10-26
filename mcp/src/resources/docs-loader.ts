import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { HASURA_GRAPHQL_URL, SAFETRUST_API_URL, repoRoot } from '../config.js';
import { escrowRolesDoc } from '../lib/escrow-roles.js';

type DocFile = {
  /** Resource name — also the last segment of the safetrust://docs/… URI. */
  name: string;
  /** Path relative to the repo root. Missing files are skipped silently. */
  path: string;
  title: string;
  description: string;
};

const DOC_FILES: DocFile[] = [
  {
    name: 'safetrust-readme',
    path: 'README.md',
    title: 'SafeTrust README',
    description: 'Monorepo overview: architecture, apps, escrow flow and local setup.',
  },
  {
    name: 'safetrust-mcp-readme',
    path: 'mcp/README.md',
    title: 'SafeTrust MCP server README',
    description: 'Setup and tool reference for this MCP server.',
  },
  {
    name: 'safetrust-mcp-trust-boundary',
    path: 'docs/mcp/README.md',
    title: 'SafeTrust MCP trust boundary and runbook',
    description:
      'What this server is and is not, client setup, the tool safety catalogue, ' +
      'and incident steps for exposed credentials.',
  },
  {
    name: 'safetrust-frontend-readme',
    path: 'apps/frontend/README.md',
    title: 'SafeTrust frontend README',
    description: 'Next.js app notes.',
  },
  {
    name: 'safetrust-api-env-example',
    path: 'apps/api/.env.example',
    title: 'apps/api environment reference',
    description: 'Environment variables the escrow API expects.',
  },
];

/**
 * Architecture context that no single file in the repo states outright — the escrow
 * lifecycle, which table holds what, and which route does which step. Generated at
 * read time so it always reflects the endpoints this server is pointed at.
 */
function architectureDoc(): string {
  return `# SafeTrust architecture context

## What SafeTrust is

A P2P rental-deposit escrow on Stellar. A tenant's deposit is locked in a
TrustlessWork single-release escrow contract and released to the owner on
fulfilment, or returned on dispute.

## Monorepo layout (pnpm workspaces + Turborepo)

| Path | What it is |
|---|---|
| \`apps/frontend\` | Next.js 14 app — wallet UI, Freighter signing, its own /api routes |
| \`apps/api\` | Express escrow/auth API (port 3002) — holds the TrustlessWork API key |
| \`infra/backend\` | Hasura metadata + migrations, multi-tenant (safetrust, hotel_industry); event triggers and actions route webhooks to apps/api |
| \`packages/graphql\`, \`packages/types\` | Generated GraphQL types and shared TS types |
| \`mcp\` | This MCP server |

## Escrow lifecycle

Two booking kinds share one escrow model: apartment deposits
(engagement id \`rental:<apartmentId>:<guestUid>\`) and hotel reservations
(\`hotel:<reservationId>\`). Every step goes through \`apps/api\` at
${SAFETRUST_API_URL}, signed in with Firebase.

1. Terms — apps/api derives amount and host wallet server-side: the apartment's
   \`warranty_deposit\` and the owner's primary wallet, or the reservation's
   \`total_amount\` and the hotel owner's primary wallet
   (\`GET /api/escrow/hotel-reservations/:id\` shows them to the guest).
2. Build — \`POST /api/escrow/deploy\` (\`apartmentId\` or \`reservationId\` +
   the guest's registered wallet), then \`/fund\`, \`/milestone-status\`,
   \`/approve-milestone\`, \`/release-funds\`, \`/resolve-dispute\`. Each checks that
   the caller's registered wallet holds the signing role
   (\`services/escrow-authz.ts\`) and records the unsigned XDR in
   \`escrow_pending_actions\` under its transaction hash (status \`built\`).
3. Sign and submit — the signer signs in their wallet in the browser and the
   frontend calls \`POST /api/escrow/send-transaction\`, which only accepts a
   signed XDR whose hash matches a row built for the same user (→ \`submitted\`).
4. Transition — each status change is checked against
   \`escrow_status_transitions\` and logged, append-only, in
   \`escrow_transactions\` (source \`submit\`, \`reconciler\` or \`admin\`).
5. Reconcile — \`POST /reconciliation/sync-escrows\` (cron, secret header) asks
   Horizon about submitted transactions and applies the ones that landed.

## Tables that matter (Hasura at ${HASURA_GRAPHQL_URL})

- \`public.escrows\` — one row per escrow, apartments and hotel reservations alike.
  \`contract_id\`, \`engagement_id\` (unique), \`apartment_id\`, \`property_id\`,
  \`sender_address\` (guest), \`receiver_address\` (host), \`amount\`, \`status\`,
  \`tenant_id\` (\`safetrust\` or \`hotel_industry\`). Statuses move along
  \`escrow_status_transitions\`: pending_signature → created → funded →
  milestone_approved → completed, with disputed/resolved/cancelled branches.
- \`public.escrow_pending_actions\` — every built transaction: action, \`tx_hash\`,
  signer, status (built, submitted, confirmed, failed, expired), \`expires_at\`.
- \`public.escrow_transactions\` — append-only transition audit log.
- \`public.trustless_work_escrows\` — TrustlessWork mirror, exposed as
  \`trustlessWorkEscrows\` with camelCase fields. Role columns: \`marker\`, \`approver\`,
  \`releaser\`, \`resolver\`. Carries the legacy hotel-booking fields.
- \`public.apartments\` — listings; \`owner_id\` → \`public.users.id\` (a Firebase UID).
- \`public.user_wallets\` — one row per Stellar wallet, \`is_primary\`, \`chain_type = 'STELLAR'\`.
- \`public.escrow_milestones\`, \`public.trustless_work_webhook_events\` — milestone and
  webhook history.

Hotel data lives in the \`hotel_industry\` source of the same Hasura
(\`reservations\`, \`rooms\`, \`hotels\`, \`users_wallets\`); hotel escrows still land in
\`public.escrows\` with \`tenant_id = 'hotel_industry'\`.

${escrowRolesDoc()}`;
}

/**
 * Registers SafeTrust documentation as MCP resources so an editor can pull project
 * context into a chat without the contributor pasting files by hand.
 */
export function loadSafeTrustDocs(server: McpServer) {
  const root = repoRoot();
  let registered = 0;

  for (const doc of DOC_FILES) {
    const absolutePath = join(root, doc.path);
    if (!existsSync(absolutePath)) continue;

    const uri = `safetrust://docs/${doc.name}`;

    server.registerResource(
      doc.name,
      uri,
      {
        title: doc.title,
        description: `${doc.description} (${doc.path})`,
        mimeType: doc.path.endsWith('.md') ? 'text/markdown' : 'text/plain',
      },
      async () => ({
        // Read on demand so edits to the file show up without restarting the server.
        contents: [
          {
            uri,
            text: readFileSync(absolutePath, 'utf-8'),
            mimeType: doc.path.endsWith('.md') ? 'text/markdown' : 'text/plain',
          },
        ],
      }),
    );

    registered += 1;
  }

  server.registerResource(
    'safetrust-architecture',
    'safetrust://docs/architecture',
    {
      title: 'SafeTrust architecture context',
      description:
        'Escrow lifecycle, monorepo layout, Hasura tables and TrustlessWork role mappings.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'safetrust://docs/architecture',
          text: architectureDoc(),
          mimeType: 'text/markdown',
        },
      ],
    }),
  );

  return { root, registered: registered + 1 };
}
