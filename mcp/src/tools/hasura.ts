import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { ALLOW_RAW_HASURA_QUERY, HASURA_GRAPHQL_URL } from '../config.js';
import { auditToolCall } from '../lib/audit.js';
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
        'List safe escrow identifiers and status/amount details, optionally filtered by ' +
        'contract, engagement or status.',
      inputSchema: {
        contractId: z.string().optional().describe('Escrow contract id'),
        engagementId: z.string().optional().describe('Escrow engagement id'),
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
        limit: z.number().int().min(1).max(100).optional().describe('Row limit (default 10)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ contractId, engagementId, status, limit }) => {
      auditToolCall('query-escrows');
      const where = buildWhere([
        ['contractId', 'String!', '{ contract_id: { _eq: $contractId } }', contractId],
        ['engagementId', 'String!', '{ engagement_id: { _eq: $engagementId } }', engagementId],
        ['status', 'String!', '{ status: { _eq: $status } }', status],
      ]);
      const resultLimit = limit ?? 10;

      const query = `
        query QueryEscrows${where.variableDefinitions} {
          escrows(
            ${where.whereArgument}
            order_by: { created_at: desc }
            limit: ${resultLimit}
          ) {
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
        const data = await hasuraRequest<{ escrows: unknown[] }>(query, where.variables);
        const limitMessage =
          data.escrows.length >= resultLimit ? ` Result limit ${resultLimit} reached.` : '';
        return textResult(
          `${data.escrows.length} escrow row(s).${limitMessage}`,
          jsonBlock(data.escrows),
        );
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
        'stores safe contract, status and amount details. Exposed in GraphQL as ' +
        'trustlessWorkEscrows with camelCase fields.',
      inputSchema: {
        contractId: z.string().optional().describe('TrustlessWork contract id'),
        status: z.string().optional().describe('e.g. created, funded, active, completed, disputed'),
        limit: z.number().int().min(1).max(100).optional().describe('Row limit (default 10)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ contractId, status, limit }) => {
      auditToolCall('query-trustless-work-escrows');
      const where = buildWhere([
        ['contractId', 'String!', '{ contractId: { _eq: $contractId } }', contractId],
        ['status', 'String!', '{ status: { _eq: $status } }', status],
      ]);
      const resultLimit = limit ?? 10;

      const query = `
        query QueryTrustlessWorkEscrows${where.variableDefinitions} {
          trustlessWorkEscrows(
            ${where.whereArgument}
            order_by: { createdAt: desc }
            limit: ${resultLimit}
          ) {
            id
            contractId
            status
            amount
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
          `${data.trustlessWorkEscrows.length} trustless_work_escrows row(s).${
            data.trustlessWorkEscrows.length >= resultLimit
              ? ` Result limit ${resultLimit} reached.`
              : ''
          }`,
          jsonBlock(data.trustlessWorkEscrows),
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
        'Look up wallets in public.user_wallets by user id or wallet address. ' +
        'Use it to resolve the addresses deploy-escrow needs.',
      inputSchema: {
        userId: z.string().optional().describe('Firebase UID stored as users.id'),
        walletAddress: z.string().optional().describe('Stellar public key'),
        limit: z.number().int().min(1).max(100).optional().describe('Row limit (default 10)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ userId, walletAddress, limit }) => {
      auditToolCall('query-user-wallets');
      const where = buildWhere([
        ['userId', 'String!', '{ user_id: { _eq: $userId } }', userId],
        [
          'walletAddress',
          'String!',
          '{ wallet_address: { _eq: $walletAddress } }',
          walletAddress,
        ],
      ]);

      if (where.isEmpty) {
        return errorResult('Provide at least one of userId or walletAddress.');
      }
      const resultLimit = limit ?? 10;

      const query = `
        query QueryUserWallets${where.variableDefinitions} {
          user_wallets(
            ${where.whereArgument}
            order_by: { is_primary: desc }
            limit: ${resultLimit}
          ) {
            user_id
            wallet_address
            is_primary
          }
        }
      `;

      try {
        const data = await hasuraRequest<{ user_wallets: unknown[] }>(query, where.variables);
        return textResult(
          `${data.user_wallets.length} wallet(s).${
            data.user_wallets.length >= resultLimit ? ` Result limit ${resultLimit} reached.` : ''
          }`,
          jsonBlock(data.user_wallets),
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );  // Off by default: unrestricted GraphQL is the one tool that can read tables no
  // other tool covers, so it needs an explicit SAFETRUST_MCP_ENABLE_RAW_HASURA=true.
  if (!ALLOW_RAW_HASURA_QUERY) return;

  server.registerTool(
    'hasura-query',
    {
      title: 'Run a read-only Hasura query',
      description:
        'Run an arbitrary read-only GraphQL query under the restricted mcp_reader role and return ' +
        'the raw JSON. Mutations and subscriptions are refused. Enable ' +
        'SAFETRUST_MCP_ENABLE_RAW_HASURA=true locally to expose it.',
      inputSchema: {
        query: z.string().min(1).describe('GraphQL query document'),
        variables: z
          .record(z.unknown())
          .optional()
          .describe('Variables object matching the query definition'),
      },
      async ({ query, variables }) => {
        auditToolCall('hasura-query');
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
