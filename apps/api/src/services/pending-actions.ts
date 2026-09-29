import { executeGraphQL } from '../lib/hasura.js';

export async function createPendingAction(engagementId: string, action: string, txHash: string, unsignedXdr: string, builtForUid: string, signerAddress: string, payload: any) {
  const mutation = `
    mutation ($engagementId: String!, $action: String!, $txHash: String!, $unsignedXdr: String!, $builtForUid: String!, $signerAddress: String!, $payload: jsonb!, $expiresAt: timestamptz!) {
      insert_escrow_pending_actions_one(object: {
        engagement_id: $engagementId,
        action: $action,
        tx_hash: $txHash,
        unsigned_xdr: $unsignedXdr,
        built_for_uid: $builtForUid,
        signer_address: $signerAddress,
        payload: $payload,
        expires_at: $expiresAt
      }) { id }
    }
  `;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await executeGraphQL(mutation, { engagementId, action, txHash, unsignedXdr, builtForUid, signerAddress, payload, expiresAt });
}

export async function getPendingActionByHash(txHash: string) {
  const query = `
    query ($txHash: String!) {
      escrow_pending_actions(where: { tx_hash: { _eq: $txHash } }) {
        id
        status
        built_for_uid
        expires_at
      }
    }
  `;
  const data = await executeGraphQL<{ escrow_pending_actions: any[] }>(query, { txHash });
  return data.escrow_pending_actions[0];
}

export async function markPendingActionSubmitted(id: string) {
  const mutation = `
    mutation ($id: uuid!) {
      update_escrow_pending_actions_by_pk(pk_columns: { id: $id }, _set: { status: "submitted", submitted_at: "now()" }) {
        id
      }
    }
  `;
  await executeGraphQL(mutation, { id });
}
