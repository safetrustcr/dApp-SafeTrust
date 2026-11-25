import { hasuraRequest } from './hasura.js';
import { ACTIONABLE_STATUSES, type ActionableEscrow, type LifecycleMessageRow } from './notifications.js';

const TENANT = 'safetrust';

/** Lifecycle messages in the user's conversations, newest first. */
export async function fetchLifecycleMessages(uid: string, limit: number): Promise<LifecycleMessageRow[]> {
  const data = await hasuraRequest<{ messages: LifecycleMessageRow[] }>(
    `query NotificationLifecycleMessages($uid: String!, $limit: Int!, $tenant: String!) {
       messages(
         where: {
           tenant_id: { _eq: $tenant }
           is_automated: { _eq: true }
           event_type: { _is_null: false }
           conversation: { _or: [{ host_id: { _eq: $uid } }, { guest_id: { _eq: $uid } }] }
         }
         order_by: { created_at: desc }
         limit: $limit
       ) {
         id event_type body created_at
         conversation {
           id escrow_id apartment_id host_id guest_id host_last_read_at guest_last_read_at
         }
       }
     }`,
    { uid, limit, tenant: TENANT },
  );
  return data.messages;
}

/**
 * Escrows in a status where some action is still possible, in which one of the
 * wallets is a party. A platform (dispute-resolver) wallet also sees every
 * disputed escrow, since it is not a party to them.
 */
export function actionableEscrowsWhere(wallets: readonly string[], includeDisputed: boolean): Record<string, unknown> {
  const asParty = {
    status: { _in: [...ACTIONABLE_STATUSES] },
    _or: [{ sender_address: { _in: [...wallets] } }, { receiver_address: { _in: [...wallets] } }],
  };
  return includeDisputed ? { _or: [asParty, { status: { _eq: 'disputed' } }] } : asParty;
}

export async function fetchActionableEscrows(
  wallets: readonly string[],
  includeDisputed: boolean,
): Promise<ActionableEscrow[]> {
  if (wallets.length === 0) return [];
  const data = await hasuraRequest<{ escrows: ActionableEscrow[] }>(
    `query NotificationActionableEscrows($where: escrows_bool_exp!) {
       escrows(where: $where, order_by: { updated_at: desc }, limit: 100) {
         id engagement_id contract_id sender_address receiver_address amount status
         created_at updated_at apartment_id apartment { name }
       }
     }`,
    { where: actionableEscrowsWhere(wallets, includeDisputed) },
  );
  return data.escrows;
}

/**
 * Which of these escrows already have a confirmed "milestone completed"
 * lifecycle message. The database only accepts that message once the milestone
 * is confirmed (messages_require_confirmed_escrow_state), so its presence is
 * the record that the host has marked the stay as completed.
 */
export async function fetchMilestoneCompletedEscrowIds(escrowIds: readonly string[]): Promise<Set<string>> {
  if (escrowIds.length === 0) return new Set();
  const data = await hasuraRequest<{ messages: { conversation: { escrow_id: string | null } | null }[] }>(
    `query NotificationMilestoneCompleted($escrowIds: [uuid!]!) {
       messages(
         where: {
           event_type: { _eq: "milestone_completed" }
           conversation: { escrow_id: { _in: $escrowIds } }
         }
       ) { conversation { escrow_id } }
     }`,
    { escrowIds: [...escrowIds] },
  );
  return new Set(
    data.messages.flatMap((m) => (m.conversation?.escrow_id ? [m.conversation.escrow_id] : [])),
  );
}
