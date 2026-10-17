import { randomUUID } from "node:crypto";
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { SAFETRUST_API_URL, STELLAR_ADDRESS_REGEX } from '../config.js';
import { apiRequest } from '../lib/api.js';
import { escrowRolesDoc } from '../lib/escrow-roles.js';
import { buildWhere, hasuraRequest } from '../lib/hasura.js';
import { describeError, errorResult, jsonBlock, textResult } from '../lib/response.js';

const stellarAddress = z
  .string()
  .regex(STELLAR_ADDRESS_REGEX, 'Must be a Stellar public key (G…, 56 chars)');

type EscrowRow = {
  id: string;
  contract_id: string | null;
  engagement_id: string;
  status: string;
  amount: string;
  property_id: string | null;
  apartment_id: string | null;
  sender_address: string;
  receiver_address: string;
  unsigned_xdr: string | null;
  created_at: string;
  updated_at: string;
};

export function registerEscrowTools(server: McpServer) {
  /**
   * Deploy — delegates to apps/api so the TrustlessWork API key and the role
   * mapping stay server-side. That route expects tenantAddress/ownerAddress plus a
   * caller-supplied engagementId (it doubles as the idempotency key), not the
   * senderAddress/receiverAddress pair the frontend route takes.
   */
  server.registerTool(
    'deploy-escrow',
    {
      title: 'Deploy escrow',
      description:
        'Deploy a SafeTrust single-release escrow for an apartment booking. Calls apps/api ' +
        'POST /api/escrow/deploy, which applies SafeTrust role mappings and returns an ' +
        'unsigned XDR for the tenant to sign with Freighter.',
      inputSchema: z.object({
        apartmentId: z.string().uuid().describe('UUID of the apartment being rented'),
        senderAddress: stellarAddress.describe('Tenant Stellar wallet — approver role'),
        receiverAddress: stellarAddress.describe('Owner Stellar wallet — serviceProvider + receiver roles'),
        amount: z.number().positive().describe('Deposit amount in USDC'),
        engagementId: z.string().optional().describe('Optional idempotency key — generated if omitted'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ apartmentId, senderAddress, receiverAddress, amount, engagementId }) => {
      try {
        const engagement = engagementId ?? randomUUID();
        const { ok, status, data } = await apiRequest<{
          unsignedXDR?: string | null;
          engagementId?: string;
          contractId?: string;
          cached?: boolean;
          error?: string;
          details?: unknown;
        }>('/api/escrow/deploy', {
          method: 'POST',
          body: { apartmentId, senderAddress, receiverAddress, amount, engagementId: engagement },
        });

        if (!ok) {
          return errorResult(
            `Deploy failed (HTTP ${status}): ${data.error ?? 'unknown error'}`,
            data.details ? jsonBlock(data.details) : '',
          );
        }

        if (data.cached) {
          return textResult(
            'Escrow already deployed for this engagementId (idempotent replay).',
            `engagementId: ${data.engagementId ?? engagementId}`,
            `contractId: ${data.contractId ?? 'unknown'}`,
          );
        }

        const xdr = data.unsignedXDR;

        return textResult(
          'Escrow deploy initiated.',
          `engagementId: ${data.engagementId ?? engagementId}`,
          `unsignedXDR: ${xdr ? `${xdr.slice(0, 48)}… (${xdr.length} chars)` : 'none returned'}`,
          '',
          'Next: sign the XDR with Freighter in the browser, then submit it through the',
          'frontend route POST /api/escrow/send-transaction — apps/api has no submit route yet.',
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
        'Fund a deployed SafeTrust escrow. Calls apps/api POST /api/escrow/fund and returns ' +
        'the unsigned XDR the tenant signs with Freighter.',
      inputSchema: {
        contractId: z.string().min(1).describe('Stellar contract address of the deployed escrow'),
        signer: stellarAddress.describe('Wallet funding the escrow — normally the tenant'),
        amount: z.number().positive().describe('Amount to fund in USDC'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ contractId, signer, amount }) => {
      try {
        const { ok, status, data } = await apiRequest<{
          unsignedTransaction?: string;
          error?: string;
          details?: unknown;
        }>('/api/escrow/fund', { method: 'POST', body: { contractId, signer, amount } });

        if (!ok) {
          return errorResult(
            `Fund failed (HTTP ${status}): ${data.error ?? 'unknown error'}`,
            data.details ? jsonBlock(data.details) : '',
          );
        }

        const xdr = data.unsignedTransaction;

        return textResult(
          'Fund transaction built.',
          `contractId: ${contractId}`,
          `amount: ${amount} USDC`,
          `unsignedTransaction: ${xdr ? `${xdr.slice(0, 48)}… (${xdr.length} chars)` : 'none returned'}`,
          '',
          'Sign it with Freighter and submit it through the frontend send-transaction route.',
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
   * and contractId returned by deploy-escrow / fund-escrow.
   */
  server.registerTool(
    'orchestrate-escrow',
    {
      title: 'Orchestrate escrow',
      description:
        'Step-by-step guide for the full SafeTrust escrow lifecycle. ' +
        'Call with step="start" to begin, then follow the "next" instruction ' +
        'in each response. Stateless — pass engagementId and contractId from ' +
        'previous steps to resume.',
      inputSchema: z.object({
        step: z
          .enum(['start', 'after-deploy', 'after-fund', 'status'])
          .describe('Current step in the lifecycle'),
        apartmentId: z.string().uuid().optional().describe('UUID of the apartment being rented'),
        senderAddress: stellarAddress.optional().describe('Tenant Stellar wallet — approver role'),
        receiverAddress: stellarAddress.optional().describe('Owner Stellar wallet — serviceProvider + receiver roles'),
        amount: z.number().positive().optional().describe('Deposit amount in USDC'),
        engagementId: z.string().optional().describe('Resume key — returned by deploy-escrow'),
        contractId: z.string().optional().describe('Resume key — returned by deploy-escrow'),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ step, apartmentId, senderAddress, receiverAddress, amount, engagementId, contractId }) => {
      switch (step) {
        case 'start':
          if (!apartmentId || !senderAddress || !receiverAddress || !amount) {
            return errorResult(
              'For step=start, provide: apartmentId, senderAddress, receiverAddress, amount'
            );
          }
          return textResult(
            '── Step 1: Deploy escrow ──────────────────────────────────',
            'Call deploy-escrow with these parameters:',
            jsonBlock({ apartmentId, senderAddress, receiverAddress, amount }),
            '',
            'deploy-escrow will return an unsignedXDR.',
            'Sign it with Freighter in the browser.',
            'Then call orchestrate-escrow again with:',
            '  step: "after-deploy"',
            '  engagementId: (from deploy-escrow response)',
            '  contractId: (from deploy-escrow response)',
            '  senderAddress: (same as above)',
            '  amount: (same as above)',
          );

        case 'after-deploy':
          if (!contractId || !senderAddress || !amount) {
            return errorResult(
              'For step=after-deploy, provide: contractId, senderAddress, amount'
            );
          }
          return textResult(
            '── Step 2: Fund escrow ────────────────────────────────────',
            `contractId: ${contractId}`,
            '',
            'The deploy XDR has been signed and submitted.',
            'Now call fund-escrow with:',
            jsonBlock({ contractId, signer: senderAddress, amount }),
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
            property_id
            apartment_id
            sender_address
            receiver_address
            unsigned_xdr
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
          `sender (tenant / approver): ${escrow.sender_address}`,
          `receiver (owner): ${escrow.receiver_address}`,
          `apartmentId: ${escrow.apartment_id ?? '(none)'}`,
          `propertyId: ${escrow.property_id ?? '(none)'}`,
          `unsignedXDR: ${escrow.unsigned_xdr ? `stored (${escrow.unsigned_xdr.length} chars)` : 'not stored'}`,
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
    async () => textResult(escrowRolesDoc(), '', `apps/api base URL: ${SAFETRUST_API_URL}`),
  );
}
