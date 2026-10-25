import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { HASURA_GRAPHQL_URL } from '../config.js';
import { buildWhere, hasuraRequest } from '../lib/hasura.js';
import { describeError, errorResult, jsonBlock, textResult } from '../lib/response.js';

/** Write operations are refused — this server is a read/inspect tool for contributors. */
const WRITE_OPERATION = /\b(mutation|subscription)\b/i;
const WRITE_ROOT_FIELD = /\b(insert_|update_|delete_)\w+/i;

export function registerHasuraTools(server: McpServer) {
  server.registerTool(
    'query-escrows',
    {
      title: 'Query escrows',
      description:
        'List rows from public.escrows (the single-release rental deposit table) filtered by ' +
        'status, apartment or wallet address.',
      inputSchema: {
        status: z
          .enum([
            'deploying',
            'pending_signature',
            'funded',
            'completed',
            'disputed',
            'resolved',
            'cancelled',
          ])
          .optional()
          .describe('Escrow status as constrained by valid_escrow_status'),
        apartmentId: z.string().uuid().optional().describe('Filter by apartment UUID'),
        senderAddress: z.string().optional().describe('Tenant Stellar wallet'),
        receiverAddress: z.string().optional().describe('Owner Stellar wallet'),
        limit: z.number().int().min(1).max(50).optional().describe('Row limit (default 10)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status, apartmentId, senderAddress, receiverAddress, limit }) => {
      const where = buildWhere([
        ['status', 'String!', '{ status: { _eq: $status } }', status],
        ['apartmentId', 'uuid!', '{ apartment_id: { _eq: $apartmentId } }', apartmentId],
        ['senderAddress', 'String!', '{ sender_address: { _eq: $senderAddress } }', senderAddress],
        [
          'receiverAddress',
          'String!',
          '{ receiver_address: { _eq: $receiverAddress } }',
          receiverAddress,
        ],
      ]);

      const query = `
        query QueryEscrows${where.variableDefinitions} {
          escrows(
            ${where.whereArgument}
            order_by: { created_at: desc }
            limit: ${limit ?? 10}
          ) {
            id
            contract_id
            engagement_id
            status
            amount
            apartment_id
            sender_address
            receiver_address
            created_at
            updated_at
          }
        }
      `;

      try {
        const data = await hasuraRequest<{ escrows: unknown[] }>(query, where.variables);
        return textResult(`${data.escrows.length} escrow row(s).`, jsonBlock(data.escrows));
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'query-trustless-work-escrows',
    {
      title: 'Query TrustlessWork escrows',
      description:
        'List rows from public.trustless_work_escrows — the TrustlessWork mirror table that ' +
        'stores marker/approver/releaser/resolver role addresses. Exposed in GraphQL as ' +
        'trustlessWorkEscrows with camelCase fields.',
      inputSchema: {
        contractId: z.string().optional().describe('TrustlessWork contract id'),
        guestId: z.string().optional().describe('Guest (tenant) user id'),
        status: z.string().optional().describe('e.g. created, funded, active, completed, disputed'),
        limit: z.number().int().min(1).max(50).optional().describe('Row limit (default 10)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ contractId, guestId, status, limit }) => {
      const where = buildWhere([
        ['contractId', 'String!', '{ contractId: { _eq: $contractId } }', contractId],
        ['guestId', 'String!', '{ guestId: { _eq: $guestId } }', guestId],
        ['status', 'String!', '{ status: { _eq: $status } }', status],
      ]);

      const query = `
        query QueryTrustlessWorkEscrows${where.variableDefinitions} {
          trustlessWorkEscrows(
            ${where.whereArgument}
            order_by: { createdAt: desc }
            limit: ${limit ?? 10}
          ) {
            id
            contractId
            marker
            approver
            releaser
            resolver
            escrowType
            status
            assetCode
            amount
            balance
            bookingId
            guestId
            tenantId
            createdAt
            updatedAt
          }
        }
      `;

      try {
        const data = await hasuraRequest<{ trustlessWorkEscrows: unknown[] }>(
          query,
          where.variables,
        );
        return textResult(
          `${data.trustlessWorkEscrows.length} trustless_work_escrows row(s).`,
          jsonBlock(data.trustlessWorkEscrows),
          '',
          'marker = owner wallet, approver = tenant wallet, releaser/resolver = platform wallet.',
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'query-user-wallets',
    {
      title: 'Query user wallets',
      description:
        'Look up Stellar wallets in public.user_wallets by user id, email or wallet address. ' +
        'Use it to resolve the addresses deploy-escrow needs.',
      inputSchema: {
        userId: z.string().optional().describe('Firebase UID stored as users.id'),
        email: z.string().optional().describe('User email'),
        walletAddress: z.string().optional().describe('Stellar public key'),
        limit: z.number().int().min(1).max(50).optional().describe('Row limit (default 10)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ userId, email, walletAddress, limit }) => {
      const where = buildWhere([
        ['userId', 'String!', '{ user_id: { _eq: $userId } }', userId],
        ['email', 'String!', '{ user: { email: { _eq: $email } } }', email],
        [
          'walletAddress',
          'String!',
          '{ wallet_address: { _eq: $walletAddress } }',
          walletAddress,
        ],
      ]);

      if (where.isEmpty) {
        return errorResult('Provide at least one of userId, email or walletAddress.');
      }

      const query = `
        query QueryUserWallets${where.variableDefinitions} {
          user_wallets(
            ${where.whereArgument}
            order_by: { is_primary: desc, created_at: asc }
            limit: ${limit ?? 10}
          ) {
            id
            user_id
            wallet_address
            chain_type
            is_primary
            provider
            created_at
            user {
              email
              first_name
              last_name
            }
          }
        }
      `;

      try {
        const data = await hasuraRequest<{ user_wallets: unknown[] }>(query, where.variables);
        return textResult(`${data.user_wallets.length} wallet(s).`, jsonBlock(data.user_wallets));
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'hasura-query',
    {
      title: 'Run a read-only Hasura query',
      description:
        'Run an arbitrary read-only GraphQL query against SafeTrust Hasura and return the raw ' +
        'JSON. Mutations and subscriptions are refused. Use the dedicated tools first — this ' +
        'is the escape hatch for tables they do not cover (bids, roles, webhook events).',
      inputSchema: {
        query: z.string().min(1).describe('GraphQL query document'),
        variables: z
          .record(z.unknown())
          .optional()
          .describe('Variables object matching the query definition'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, variables }) => {
      if (WRITE_OPERATION.test(query) || WRITE_ROOT_FIELD.test(query)) {
        return errorResult(
          'Refused: this tool only runs read-only queries.',
          'Mutations, subscriptions and insert_/update_/delete_ root fields are blocked.',
        );
      }

      try {
        const data = await hasuraRequest<Record<string, unknown>>(
          query,
          (variables ?? {}) as Record<string, unknown>,
        );
        return textResult(`Hasura ${HASURA_GRAPHQL_URL}`, jsonBlock(data));
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );
}
