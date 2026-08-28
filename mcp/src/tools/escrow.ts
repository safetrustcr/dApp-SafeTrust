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
