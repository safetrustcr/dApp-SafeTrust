import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { HASURA_GRAPHQL_URL, SAFETRUST_API_URL, repoRoot } from '../config.js';
import { escrowRolesDoc } from '../lib/escrow-roles.js';

/** Resource contents type — same shape the MCP SDK expects. */
interface ResourceContents {
  uri: string;
  text: string;
  mimeType: string;
}

/** Graceful error fallback when a resource handler fails. */
function resourceError(uri: string, message: string): { contents: ResourceContents[] } {
  return {
    contents: [{
      uri,
      text: `Error loading resource: ${message}`,
      mimeType: 'text/plain',
    }],
  };
}

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
| \`services/webhook\` | Receives TrustlessWork webhooks and updates escrow rows |
| \`infra/backend\` | Hasura metadata + migrations, multi-tenant (safetrust, hotel_industry) |
| \`packages/graphql\`, \`packages/types\` | Generated GraphQL types and shared TS types |
| \`mcp\` | This MCP server |

## Escrow lifecycle

1. Tenant picks an apartment — \`public.apartments\`, \`warranty_deposit\` is the escrow amount.
2. Deploy — \`POST ${SAFETRUST_API_URL}/api/escrow/deploy\` calls TrustlessWork
   \`/deployer/single-release\` and returns an unsigned XDR. \`engagementId\` is the
   idempotency key (see \`apps/api/src/services/idempotency.ts\`).
3. Tenant signs the XDR with Freighter and submits it via the frontend route
   \`POST /api/escrow/send-transaction\`.
4. Fund — \`POST ${SAFETRUST_API_URL}/api/escrow/fund\` → another XDR to sign.
5. Milestone — \`POST /api/escrow/milestone-status\` (serviceProvider marks it done).
6. Release — \`POST /api/escrow/release-funds\` sends funds to the owner.
7. Webhooks land in \`services/webhook\` and update escrow status rows.

## Tables that matter (Hasura at ${HASURA_GRAPHQL_URL})

- \`public.escrows\` — current single-release rental deposits.
  \`contract_id\`, \`engagement_id\` (unique), \`apartment_id\`, \`sender_address\` (tenant),
  \`receiver_address\` (owner), \`amount\`, \`status\`, \`unsigned_xdr\`, \`tenant_id\`.
  Status is constrained to: deploying, pending_signature, funded, completed, disputed,
  resolved, cancelled.
- \`public.trustless_work_escrows\` — TrustlessWork mirror, exposed as
  \`trustlessWorkEscrows\` with camelCase fields. Role columns: \`marker\`, \`approver\`,
  \`releaser\`, \`resolver\`. Carries the legacy hotel-booking fields.
- \`public.apartments\` — listings; \`owner_id\` → \`public.users.id\` (a Firebase UID).
- \`public.user_wallets\` — one row per Stellar wallet, \`is_primary\`, \`chain_type = 'STELLAR'\`.
- \`public.escrow_milestones\`, \`public.trustless_work_webhook_events\` — milestone and
  webhook history.

Every SafeTrust row carries \`tenant_id = 'safetrust'\`; the same database also serves
the \`hotel_industry\` tenant.

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
      async () => {
        // Read on demand so edits to the file show up without restarting the server.
        // Lazy: no I/O at registration time — only when a client requests this resource.
        try {
          return {
            contents: [
              {
                uri,
                text: readFileSync(absolutePath, 'utf-8'),
                mimeType: doc.path.endsWith('.md') ? 'text/markdown' : 'text/plain',
              },
            ],
          };
        } catch (err) {
          return resourceError(
            uri,
            `Could not read ${doc.path}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
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
    async () => {
      // Lazy: architecture context is built on first request, not at startup.
      try {
        return {
          contents: [
            {
              uri: 'safetrust://docs/architecture',
              text: architectureDoc(),
              mimeType: 'text/markdown',
            },
          ],
        };
      } catch (err) {
        return resourceError(
          'safetrust://docs/architecture',
          `Could not build architecture doc: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );

  return { root, registered: registered + 1 };
}
