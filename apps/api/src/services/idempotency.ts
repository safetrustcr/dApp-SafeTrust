import { hasuraRequest } from './hasura.js';

type IdempotencyHit = {
  exists: true;
  result: {
    engagement_id: string;
    contract_id: string | null;
    status: string;
  };
};

type IdempotencyMiss = { exists: false };

export type IdempotencyResult = IdempotencyHit | IdempotencyMiss;

/**
 * Check if an escrow deploy has already been executed for this engagementId.
 *
 * Uses public.escrows.engagement_id UNIQUE constraint as the idempotency key.
 * O(1) — single indexed DB lookup per request.
 *
 * Prevents duplicate TrustlessWork escrow creation from double-clicks or
 * network retries. The DB constraint catches duplicates at the INSERT level,
 * but this check fires BEFORE the TrustlessWork API call — avoiding the
 * on-chain cost of a second escrow being created before the DB can block it.
 */
export async function checkIdempotency(
  engagementId: string
): Promise<IdempotencyResult> {
  const data = await hasuraRequest<{
    escrows: Array<{
      engagement_id: string;
      contract_id: string | null;
      status: string;
    }>;
  }>(
    `query CheckIdempotency($engagementId: String!) {
      escrows(
        where: { engagement_id: { _eq: $engagementId } }
        limit: 1
      ) {
        engagement_id
        contract_id
        status
      }
    }`,
    { engagementId }
  );

  const existing = data.escrows?.[0];

  if (existing) {
    return { exists: true, result: existing };
  }

  return { exists: false };
}