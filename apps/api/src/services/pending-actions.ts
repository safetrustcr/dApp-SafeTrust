/**
 * escrow_pending_actions: every unsigned XDR apps/api builds is recorded here
 * under its transaction hash. A signed XDR is only accepted if its hash matches
 * a row built for the same user — the action, escrow and parameters come from
 * this row, never from the request body.
 */
import { hasuraRequest } from './hasura.js';
import type { EscrowAction } from './escrow-authz.js';

export type PendingStatus = 'built' | 'submitted' | 'confirmed' | 'failed' | 'expired';

export type PendingAction = {
  id: string;
  engagement_id: string;
  contract_id: string | null;
  action: EscrowAction;
  tx_hash: string;
  unsigned_xdr: string;
  built_for_uid: string;
  signer_address: string;
  payload: Record<string, unknown>;
  status: PendingStatus;
  created_at: string;
  expires_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
};

export type NewPendingAction = Pick<
  PendingAction,
  'engagement_id' | 'contract_id' | 'action' | 'tx_hash' | 'unsigned_xdr' | 'built_for_uid' | 'signer_address' | 'payload'
> & { expires_at: Date };

const FIELDS = `
  id engagement_id contract_id action tx_hash unsigned_xdr built_for_uid
  signer_address payload status created_at expires_at submitted_at confirmed_at
`;

export function isExpired(row: Pick<PendingAction, 'expires_at'>, now: Date = new Date()): boolean {
  return new Date(row.expires_at).getTime() <= now.getTime();
}

/** Moves stale `built` rows to `expired` so the live partial unique index frees up. */
export async function expireStaleActions(engagementId: string, action: EscrowAction, now = new Date()): Promise<void> {
  await hasuraRequest(
    `mutation ExpireStalePendingActions($engagementId: String!, $action: String!, $now: timestamptz!) {
       update_escrow_pending_actions(
         where: {
           engagement_id: { _eq: $engagementId }
           action: { _eq: $action }
           status: { _eq: "built" }
           expires_at: { _lte: $now }
         }
         _set: { status: "expired" }
       ) { affected_rows }
     }`,
    { engagementId, action, now: now.toISOString() },
  );
}

/** The live (built or submitted) row for this escrow + action, if any. */
export async function findLiveAction(engagementId: string, action: EscrowAction): Promise<PendingAction | null> {
  const data = await hasuraRequest<{ escrow_pending_actions: PendingAction[] }>(
    `query LivePendingAction($engagementId: String!, $action: String!) {
       escrow_pending_actions(
         where: {
           engagement_id: { _eq: $engagementId }
           action: { _eq: $action }
           status: { _in: ["built", "submitted"] }
         }
         order_by: { created_at: desc }
         limit: 1
       ) { ${FIELDS} }
     }`,
    { engagementId, action },
  );
  return data.escrow_pending_actions[0] ?? null;
}

export async function insertPendingAction(input: NewPendingAction): Promise<PendingAction> {
  const data = await hasuraRequest<{ insert_escrow_pending_actions_one: PendingAction }>(
    `mutation InsertPendingAction($object: escrow_pending_actions_insert_input!) {
       insert_escrow_pending_actions_one(object: $object) { ${FIELDS} }
     }`,
    { object: { ...input, expires_at: input.expires_at.toISOString() } },
  );
  return data.insert_escrow_pending_actions_one;
}

export async function getPendingActionByHash(txHash: string): Promise<PendingAction | null> {
  const data = await hasuraRequest<{ escrow_pending_actions: PendingAction[] }>(
    `query PendingActionByHash($txHash: String!) {
       escrow_pending_actions(where: { tx_hash: { _eq: $txHash } }, limit: 1) { ${FIELDS} }
     }`,
    { txHash },
  );
  return data.escrow_pending_actions[0] ?? null;
}

/**
 * Atomically claims a built row for submission (built → submitted).
 * Returns false when another request already claimed it.
 */
export async function claimForSubmission(id: string): Promise<boolean> {
  const data = await hasuraRequest<{ update_escrow_pending_actions: { affected_rows: number } }>(
    `mutation ClaimPendingAction($id: uuid!, $now: timestamptz!) {
       update_escrow_pending_actions(
         where: { id: { _eq: $id }, status: { _eq: "built" } }
         _set: { status: "submitted", submitted_at: $now }
       ) { affected_rows }
     }`,
    { id, now: new Date().toISOString() },
  );
  return data.update_escrow_pending_actions.affected_rows === 1;
}

/** Undo a claim when Trustless Work rejected the submission, so the user can retry. */
export async function releaseClaim(id: string): Promise<void> {
  await hasuraRequest(
    `mutation ReleasePendingClaim($id: uuid!) {
       update_escrow_pending_actions(
         where: { id: { _eq: $id }, status: { _eq: "submitted" } }
         _set: { status: "built", submitted_at: null }
       ) { affected_rows }
     }`,
    { id },
  );
}

export async function setPendingContractId(id: string, contractId: string): Promise<void> {
  await hasuraRequest(
    `mutation SetPendingContractId($id: uuid!, $contractId: String!) {
       update_escrow_pending_actions(where: { id: { _eq: $id } }, _set: { contract_id: $contractId }) {
         affected_rows
       }
     }`,
    { id, contractId },
  );
}
