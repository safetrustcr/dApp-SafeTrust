/**
 * Escrow authorization: proves that the authenticated Firebase user controls
 * the Stellar wallet holding the escrow role an action requires.
 *
 * Roles (single-release escrow as deployed by apps/api):
 *   approver        = escrow sender   (guest)
 *   serviceProvider = escrow receiver (host)
 *   releaseSigner   = escrow sender   (guest)
 *   disputeResolver = PLATFORM_STELLAR_ADDRESS (platform; admin role also required at the route)
 */
import { hasuraRequest } from './hasura.js';

export type EscrowAction =
  | 'initialize'
  | 'fund'
  | 'mark_milestone_completed'
  | 'approve_milestone'
  | 'release_funds'
  | 'resolve_dispute';

export type EscrowRole = 'approver' | 'serviceProvider' | 'releaseSigner' | 'disputeResolver';

export const ACTION_ROLE: Readonly<Record<EscrowAction, EscrowRole>> = {
  initialize: 'approver',
  fund: 'approver',
  mark_milestone_completed: 'serviceProvider',
  approve_milestone: 'approver',
  release_funds: 'releaseSigner',
  resolve_dispute: 'disputeResolver',
};

export type EscrowRoles = Record<EscrowRole, string>;

/** Columns of public.escrows used here — adjust if the schema differs. */
export type EscrowRecord = {
  id: string;
  engagement_id: string;
  contract_id: string | null;
  sender_address: string;
  receiver_address: string;
  amount: number | string;
  status: string;
};

export class EscrowAccessError extends Error {
  constructor(
    readonly status: 403 | 404 | 409 | 500,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'EscrowAccessError';
  }
}

/* ─────────────────────────────── pure core ─────────────────────────────── */

export function rolesFor(
  escrow: Pick<EscrowRecord, 'sender_address' | 'receiver_address'>,
  platformAddress: string | undefined = process.env.PLATFORM_STELLAR_ADDRESS,
): EscrowRoles {
  if (!platformAddress) {
    throw new EscrowAccessError(500, 'PLATFORM_ADDRESS_MISSING', 'PLATFORM_STELLAR_ADDRESS is not configured.');
  }
  return {
    approver: escrow.sender_address,
    serviceProvider: escrow.receiver_address,
    releaseSigner: escrow.sender_address,
    disputeResolver: platformAddress,
  };
}

/**
 * Returns the wallet that must sign `action`, or throws 403 when none of the
 * caller's registered wallets holds the required role.
 */
export function resolveSigner(
  callerWallets: readonly string[],
  roles: EscrowRoles,
  action: EscrowAction,
): string {
  const role = ACTION_ROLE[action];
  const required = roles[role];
  if (!required || !callerWallets.includes(required)) {
    throw new EscrowAccessError(
      403,
      'WALLET_NOT_AUTHORIZED',
      `Your registered wallet is not the ${role} for this escrow.`,
    );
  }
  return required;
}

/** True when any caller wallet holds any role on the escrow. */
export function isParticipant(callerWallets: readonly string[], roles: EscrowRoles): boolean {
  return Object.values(roles).some((address) => callerWallets.includes(address));
}

/* ─────────────────────────────── data access ────────────────────────────── */

export async function getUserWallets(uid: string): Promise<string[]> {
  const data = await hasuraRequest<{ user_wallets: Array<{ wallet_address: string }> }>(
    `query CallerWallets($uid: String!) {
       user_wallets(where: { user_id: { _eq: $uid } }) { wallet_address }
     }`,
    { uid },
  );
  return data.user_wallets.map((w) => w.wallet_address);
}

export async function getEscrowByEngagementId(engagementId: string): Promise<EscrowRecord | null> {
  const data = await hasuraRequest<{ escrows: EscrowRecord[] }>(
    `query EscrowForAuthz($engagementId: String!) {
       escrows(where: { engagement_id: { _eq: $engagementId } }, limit: 1) {
         id engagement_id contract_id sender_address receiver_address amount status
       }
     }`,
    { engagementId },
  );
  return data.escrows[0] ?? null;
}

/* ─────────────────────────────── entry points ───────────────────────────── */

export async function authorizeEscrowAction(
  uid: string,
  engagementId: string,
  action: EscrowAction,
): Promise<{ signer: string; escrow: EscrowRecord; roles: EscrowRoles }> {
  const escrow = await getEscrowByEngagementId(engagementId);
  if (!escrow) throw new EscrowAccessError(404, 'ESCROW_NOT_FOUND', 'Escrow not found.');

  const roles = rolesFor(escrow);
  const wallets = await getUserWallets(uid);
  const signer = resolveSigner(wallets, roles, action);
  return { signer, escrow, roles };
}

export async function assertEscrowParticipant(uid: string, engagementId: string): Promise<EscrowRecord> {
  const escrow = await getEscrowByEngagementId(engagementId);
  if (!escrow) throw new EscrowAccessError(404, 'ESCROW_NOT_FOUND', 'Escrow not found.');
  const wallets = await getUserWallets(uid);
  if (!isParticipant(wallets, rolesFor(escrow))) {
    throw new EscrowAccessError(403, 'NOT_A_PARTICIPANT', 'You are not a participant in this escrow.');
  }
  return escrow;
}
