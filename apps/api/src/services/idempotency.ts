import { hasuraRequest } from './hasura.js';

export type IdempotencyResult = {
  exists: boolean;
  result?: {
    engagement_id: string;
    contract_id: string;
    status: string;
  };
};

type CheckIdempotencyResponse = {
  escrows: {
    engagement_id: string;
    contract_id: string;
    status: string;
  }[];
};

/**
 * Checks whether an escrow deploy for this engagementId has already been
 * executed, so a retried/double-clicked deploy request can short-circuit
 * before calling TrustlessWork again.
 */
export async function checkIdempotency(engagementId: string): Promise<IdempotencyResult> {
  const data = await hasuraRequest<CheckIdempotencyResponse>(
    `query CheckEscrowIdempotency($engagement_id: String!) {
      escrows(where: { engagement_id: { _eq: $engagement_id } }, limit: 1) {
        engagement_id
        contract_id
        status
      }
    }`,
    { engagement_id: engagementId },
  );

  const existing = data.escrows[0];
  if (!existing) {
    return { exists: false };
  }

  return { exists: true, result: existing };
}
