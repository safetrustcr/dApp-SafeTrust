import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { auditToolCall } from '../lib/audit.js';
import { buildWhere, hasuraRequest } from '../lib/hasura.js';
import { describeError, errorResult, textResult } from '../lib/response.js';

type OwnerWallet = { wallet_address: string; is_primary: boolean };

type Apartment = {
  id: string;
  name: string;
  price: string;
  warranty_deposit: string;
  is_available: boolean;
  available_from: string;
  available_until: string | null;
  owner?: {
    id: string;
    user_wallets: OwnerWallet[];
  } | null;
};

/** Columns available to the mcp_reader role. */
const APARTMENT_FIELDS = `
  id
  owner_id
  name
  price
  warranty_deposit
  is_available
  available_from
  available_until
`;

export function registerApartmentTools(server: McpServer) {
  server.registerTool(
    'get-apartment',
    {
      title: 'Get apartment',
      description:
        'Get apartment details including the owner Stellar wallet needed as ownerAddress ' +
        'for escrow deployment. Queries public.apartments in Hasura.',
      inputSchema: {
        apartmentId: z.string().uuid().describe('UUID of the apartment'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId }) => {
      auditToolCall('get-apartment');
      const query = `
        query GetApartment($id: uuid!) {
          apartments(where: { id: { _eq: $id } }, limit: 1) {
            ${APARTMENT_FIELDS}
            owner {
              id
              user_wallets(
                order_by: { is_primary: desc }
                limit: 1
              ) {
                wallet_address
                is_primary
              }
            }
          }
        }
      `;

      try {
        const data = await hasuraRequest<{ apartments: Apartment[] }>(query, { id: apartmentId });
        const apartment = data.apartments[0];

        if (!apartment) {
          return textResult(`No apartment found with id ${apartmentId}.`);
        }
        const owner = apartment.owner;
        const wallet = owner?.user_wallets?.[0]?.wallet_address;

        return textResult(
          `Apartment: ${apartment.name}`,
          `id: ${apartment.id}`,
          `price: ${apartment.price} / month`,
          `warranty_deposit: ${apartment.warranty_deposit} USDC (the escrow amount)`,
          `available: ${apartment.is_available ? 'yes' : 'no'} (from ${apartment.available_from}${apartment.available_until ? ` until ${apartment.available_until}` : ''})`,
          `owner user id: ${owner?.id ?? 'unknown'}`,
          wallet
            ? `owner wallet (ownerAddress for deploy-escrow): ${wallet}`
            : 'owner has no STELLAR wallet in public.user_wallets — deploy-escrow will be blocked',
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'list-apartments',
    {
      title: 'List apartments',
      description:
        'List SafeTrust apartments with optional name search and price bounds. Soft-deleted ' +
        'rows are excluded. Use it to find the apartmentId that deploy-escrow needs.',
      inputSchema: {
        search: z.string().optional().describe('Case-insensitive substring match on the name'),
        onlyAvailable: z
          .boolean()
          .optional()
          .describe('Restrict to is_available = true. Defaults to true.'),
        minPrice: z.number().nonnegative().optional().describe('Minimum monthly price'),
        maxPrice: z.number().positive().optional().describe('Maximum monthly price'),
        limit: z.number().int().min(1).max(100).optional().describe('Row limit (default 10)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ search, onlyAvailable, minPrice, maxPrice, limit }) => {
      auditToolCall('list-apartments');
      const resultLimit = limit ?? 10;
      const where = buildWhere([
        ['search', 'String!', '{ name: { _ilike: $search } }', search ? `%${search}%` : undefined],
        [
          'onlyAvailable',
          'Boolean!',
          '{ is_available: { _eq: $onlyAvailable } }',
          onlyAvailable === false ? undefined : true,
        ],
        ['minPrice', 'numeric!', '{ price: { _gte: $minPrice } }', minPrice],
        ['maxPrice', 'numeric!', '{ price: { _lte: $maxPrice } }', maxPrice],
      ]);

      const query = `
        query ListApartments${where.variableDefinitions} {
          apartments(
            ${where.whereArgument}
            order_by: { created_at: desc }
            limit: ${resultLimit}
          ) {
            ${APARTMENT_FIELDS}
          }
        }
      `;

      try {
        const data = await hasuraRequest<{ apartments: Apartment[] }>(query, where.variables);

        if (data.apartments.length === 0) {
          return textResult('No apartments matched those filters.');
        }

        const rows = data.apartments.map((apartment) => ({
          id: apartment.id,
          name: apartment.name,
          price: apartment.price,
          warranty_deposit: apartment.warranty_deposit,
          is_available: apartment.is_available,
        }));

        return textResult(
          `${rows.length} apartment(s) found.${
            rows.length >= resultLimit ? ` Result limit ${resultLimit} reached.` : ''
          }`,
          JSON.stringify(rows, null, 2),
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );
}
