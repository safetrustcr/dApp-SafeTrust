import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  MCP_MUTATIONS_ENABLED,
  SAFETRUST_API_URL,
  STELLAR_ADDRESS_REGEX,
} from '../config.js';
import { apiRequest } from '../lib/api.js';
import { auditToolCall } from '../lib/audit.js';
import { escrowRolesDoc } from '../lib/escrow-roles.js';
import { buildWhere, hasuraRequest } from '../lib/hasura.js';
import { describeError, errorResult, jsonBlock, textResult } from '../lib/response.js';

const stellarAddress = z
  .string()
  .regex(STELLAR_ADDRESS_REGEX, 'Must be a Stellar public key (G…, 56 chars)');

async function mutationGuard(): Promise<string | undefined> {
  if (!MCP_MUTATIONS_ENABLED) {
    return 'Escrow mutations are disabled. Set SAFETRUST_MCP_ALLOW_MUTATIONS=true to enable them for a Testnet test user.';
  }

  const health = await apiRequest<{ stellarNetwork?: string }>('/health');
  if (!health.ok) {
    return `Cannot verify the API network (HTTP ${health.status}); escrow mutations are refused.`;
  }
  if (health.data.stellarNetwork !== 'TESTNET') {
    return 'Escrow mutations require apps/api to report stellarNetwork=TESTNET; no mutation was sent.';
  }
}

type EscrowRow = {
  id: string;
  contract_id: string | null;
  engagement_id: string;
  status: string;
  amount: string;
  created_at: string;
  updated_at: string;
};

export function registerEscrowTools(server: McpServer) {
  /**
   * Deploy — delegates to apps/api so the TrustlessWork API key and the role
   * mapping stay server-side. The API resolves escrow terms and verifies the
   * sender wallet against the authenticated Firebase user.
   */
  server.registerTool(
    'deploy-escrow',
    {
      title: 'Deploy escrow',
      description:
        'Build an unsigned Testnet escrow deployment for the configured local test user. ' +
        'Mutation tools are disabled unless SAFETRUST_MCP_ALLOW_MUTATIONS=true.',
      inputSchema: z.object({
        apartmentId: z.string().uuid().describe('UUID of the apartment being rented'),
        senderAddress: stellarAddress.describe('Tenant Stellar wallet — approver role'),
        idempotencyKey: z.string().uuid().optional().describe('UUID reused to safely retry this request'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ apartmentId, senderAddress, idempotencyKey }) => {
      auditToolCall('deploy-escrow');
      try {
        const blocked = await mutationGuard();
        if (blocked) return errorResult(blocked);

        const key = idempotencyKey ?? randomUUID();
        const { ok, status, data } = await apiRequest<{
          unsignedXDR?: string | null;
          engagementId?: string;
          contractId?: string;
          pendingActionId?: string;
          cached?: boolean;
          error?: string;
          details?: unknown;
        }>('/api/escrow/deploy', {
          method: 'POST',
          body: { apartmentId, senderAddress },
          auth: 'required',
          idempotencyKey: key,
        });

        if (!ok) {
          return errorResult(
            `Deploy failed (HTTP ${status}): ${data.error ?? 'unknown error'}`,
            data.details ? jsonBlock(data.details) : '',
            `idempotencyKey: ${key}`,
          );
        }

        return textResult(
          data.cached ? 'Escrow deployment replayed.' : 'Unsigned Testnet escrow deployment built.',
          `idempotencyKey: ${key}`,
          `engagementId: ${data.engagementId ?? 'not returned'}`,
          `pendingActionId: ${data.pendingActionId ?? 'not returned'}`,
          `unsignedXDR: ${data.unsignedXDR ?? 'not returned'}`,
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  /** Fund — apps/api POST /api/escrow/fund, again returning an unsigned XDR. */
  server.registerTool(
    'fund-escrow',
    {
      title: 'Fund escrow',
      description:
        'Build an unsigned Testnet funding transaction for the configured local test user. ' +
        'Mutation tools are disabled unless SAFETRUST_MCP_ALLOW_MUTATIONS=true.',
      inputSchema: {
        engagementId: z.string().min(1).describe('engagementId returned by deploy-escrow'),
        idempotencyKey: z.string().uuid().optional().describe('UUID reused to safely retry this request'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ engagementId, idempotencyKey }) => {
      auditToolCall('fund-escrow');
      try {
        const blocked = await mutationGuard();
        if (blocked) return errorResult(blocked);

        const key = idempotencyKey ?? randomUUID();
        const { ok, status, data } = await apiRequest<{
          unsignedXdr?: string;
          pendingActionId?: string;
          contractId?: string | null;
          reused?: boolean;
          error?: string;
          details?: unknown;
        }>('/api/escrow/fund', {
          method: 'POST',
          body: { engagementId },
          auth: 'required',
          idempotencyKey: key,
        });

        if (!ok) {
          return errorResult(
            `Fund failed (HTTP ${status}): ${data.error ?? 'unknown error'}`,
            data.details ? jsonBlock(data.details) : '',
            `idempotencyKey: ${key}`,
          );
        }

        return textResult(
          data.reused ? 'Funding action replayed.' : 'Unsigned Testnet funding transaction built.',
          `idempotencyKey: ${key}`,
          `engagementId: ${engagementId}`,
          `pendingActionId: ${data.pendingActionId ?? 'not returned'}`,
          `unsignedXDR: ${data.unsignedXdr ?? 'not returned'}`,
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  /**
   * Orchestrate — a stateless, step-by-step guide through the full deploy →
   * fund → release lifecycle. It never holds state and never talks to
   * TrustlessWork directly: every step points at apps/api routes (through the
   * other MCP tools) or at the frontend send-transaction route for Freighter
   * signing. The caller resumes a sequence by passing back the engagementId
   * returned by deploy-escrow.
   */
  server.registerTool(
    'orchestrate-escrow',
    {
      title: 'Orchestrate escrow',
      description:
        'Step-by-step guide for the full SafeTrust escrow lifecycle. ' +
        'Call with step="start" to begin, then follow the "next" instruction ' +
        'in each response. Stateless — pass engagementId from ' +
        'previous steps to resume.',
      inputSchema: z.object({
        step: z
          .enum(['start', 'after-deploy', 'after-fund', 'status'])
          .describe('Current step in the lifecycle'),
        apartmentId: z.string().uuid().optional().describe('UUID of the apartment being rented'),
        senderAddress: stellarAddress.optional().describe('Tenant Stellar wallet — approver role'),
        engagementId: z.string().optional().describe('Resume key — returned by deploy-escrow'),
        contractId: z.string().optional().describe('Resume key — returned by deploy-escrow'),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ step, apartmentId, senderAddress, engagementId, contractId }) => {
      auditToolCall('orchestrate-escrow');
      switch (step) {
        case 'start':
          if (!apartmentId || !senderAddress) {
            return errorResult(
              'For step=start, provide: apartmentId and senderAddress'
            );
          }
          return textResult(
            '── Step 1: Deploy escrow ──────────────────────────────────',
            'Call deploy-escrow with these parameters:',
            jsonBlock({ apartmentId, senderAddress }),
            '',
            'deploy-escrow will return an unsignedXDR.',
            'Sign it with Freighter in the browser.',
            'Then call orchestrate-escrow again with:',
            '  step: "after-deploy"',
            '  engagementId: (from deploy-escrow response)',
          );

        case 'after-deploy':
          if (!engagementId) {
            return errorResult(
              'For step=after-deploy, provide engagementId from deploy-escrow'
            );
          }
          return textResult(
            '── Step 2: Fund escrow ────────────────────────────────────',
            `engagementId: ${engagementId}`,
            '',
            'The deploy XDR has been signed and submitted.',
            'Now call fund-escrow with:',
            jsonBlock({ engagementId }),
            '',
            'fund-escrow returns another unsignedXDR.',
            'Sign it with Freighter.',
            'Then call orchestrate-escrow with step="after-fund" to continue.',
          );

        case 'after-fund':
          return textResult(
            '── Step 3: Escrow funded ──────────────────────────────────',
            'The escrow is now funded and locked on Stellar.',
            '',
            'When the host completes the service:',
            '  1. Host marks milestone done (POST /api/escrow/milestone-status)',
            '  2. Tenant calls release-funds (POST /api/escrow/release-funds)',
            '',
            'To check current status:',
            '  call get-escrow-status with contractId or engagementId',
            '',
            escrowRolesDoc(),
          );

        case 'status':
          if (!contractId && !engagementId) {
            return errorResult('Provide contractId or engagementId to check status.');
          }
          return textResult(
            'Call get-escrow-status with:',
            jsonBlock({ contractId, engagementId }),
          );
      }
    },
  );

  /** Status — reads public.escrows directly, so it works without apps/api running. */
  server.registerTool(
    'get-escrow-status',
    {
      title: 'Get escrow status',
      description:
        'Get the current status of a SafeTrust escrow by contractId or engagementId. ' +
        'Queries the public.escrows table in Hasura.',
      inputSchema: {
        contractId: z.string().optional().describe('Stellar contract address'),
        engagementId: z.string().optional().describe('TrustlessWork engagement ID'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ contractId, engagementId }) => {
      auditToolCall('get-escrow-status');
      if (!contractId && !engagementId) {
        return errorResult('Provide either contractId or engagementId — not both, not neither.');
      }
      if (contractId && engagementId) {
        return errorResult(
          'Provide only one identifier. ' +
          'Supplying both contractId and engagementId is ambiguous.'
        );
      }

      const where = buildWhere(
        [
          ['contractId', 'String!', '{ contract_id: { _eq: $contractId } }', contractId],
          ['engagementId', 'String!', '{ engagement_id: { _eq: $engagementId } }', engagementId],
        ],
        '_or',
      );

      const query = `
        query GetEscrowStatus${where.variableDefinitions} {
          escrows(${where.whereArgument}, limit: 1, order_by: { created_at: desc }) {
            id
            contract_id
            engagement_id
            status
            amount
            created_at
            updated_at
          }
        }
      `;

      try {
        const data = await hasuraRequest<{ escrows: EscrowRow[] }>(query, where.variables);
        const escrow = data.escrows[0];

        if (!escrow) {
          return textResult(
            'No escrow found for that identifier in public.escrows.',
            'If it came from the legacy hotel flow, try query-trustless-work-escrows instead.',
          );
        }

        return textResult(
          'Escrow found.',
          `contractId: ${escrow.contract_id ?? '(not set yet)'}`,
          `engagementId: ${escrow.engagement_id}`,
          `status: ${escrow.status}`,
          `amount: ${escrow.amount} USDC`,
          `created: ${escrow.created_at}`,
          `updated: ${escrow.updated_at}`,
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  /** Pure context — no network calls, just SafeTrust's role mapping. */
  server.registerTool(
    'explain-escrow-roles',
    {
      title: 'Explain escrow roles',
      description:
        'Explain SafeTrust role mappings for a TrustlessWork single-release escrow, including ' +
        'the database columns each role lands in and the USDC trustline used on testnet.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      auditToolCall('explain-escrow-roles');
      return textResult(escrowRolesDoc(), '', `apps/api base URL: ${SAFETRUST_API_URL}`);
    },
  );
}
