/**
 * Hasura reads behind the escrow diagnostics tools.
 *
 * Every query here mirrors one apps/api runs (named in each comment), so the
 * MCP explains a booking with the same data the API acts on. None of them
 * select `unsigned_xdr`. These are the reads #530 moves under the
 * least-privilege `mcp_reader` role.
 */
import { buildWhere, hasuraRequest } from './hasura.js';

export type EscrowRow = {
  id: string;
  contract_id: string | null;
  engagement_id: string;
  status: string;
  amount: string | number;
  property_id: string | null;
  apartment_id: string | null;
  tenant_id: string | null;
  sender_address: string;
  receiver_address: string;
  created_at: string;
  updated_at: string;
};

export type TransitionRow = {
  action: string;
  from_status: string | null;
  to_status: string | null;
  tx_hash: string | null;
  source: string;
  created_at: string;
};

export type PendingStatus = 'built' | 'submitted' | 'confirmed' | 'failed' | 'expired';

export type PendingActionRow = {
  id: string;
  action: string;
  status: PendingStatus;
  tx_hash: string;
  contract_id: string | null;
  signer_address: string;
  created_at: string;
  expires_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
};

const ESCROW_FIELDS = `
  id contract_id engagement_id status amount property_id apartment_id tenant_id
  sender_address receiver_address created_at updated_at
`;

/** apps/api services/escrow-authz.ts getEscrowByEngagementId / getEscrowByContractId. */
export async function getEscrow(key: { engagementId?: string; contractId?: string }): Promise<EscrowRow | null> {
  const where = buildWhere(
    [
      ['engagementId', 'String!', '{ engagement_id: { _eq: $engagementId } }', key.engagementId],
      ['contractId', 'String!', '{ contract_id: { _eq: $contractId } }', key.contractId],
    ],
    '_or',
  );
  if (where.isEmpty) return null;
  const data = await hasuraRequest<{ escrows: EscrowRow[] }>(
    `query McpEscrow${where.variableDefinitions} {
       escrows(${where.whereArgument}, order_by: { created_at: desc }, limit: 1) { ${ESCROW_FIELDS} }
     }`,
    where.variables,
  );
  return data.escrows[0] ?? null;
}

export async function getEscrowsForApartment(apartmentId: string): Promise<EscrowRow[]> {
  const data = await hasuraRequest<{ escrows: EscrowRow[] }>(
    `query McpApartmentEscrows($apartmentId: uuid!) {
       escrows(where: { apartment_id: { _eq: $apartmentId } }, order_by: { created_at: desc }, limit: 5) {
         ${ESCROW_FIELDS}
       }
     }`,
    { apartmentId },
  );
  return data.escrows;
}

/** The transition audit log (public.escrow_transactions), newest first. */
export async function getTransitions(engagementId: string, contractId: string | null, limit = 10): Promise<TransitionRow[]> {
  const where = buildWhere(
    [
      ['engagementId', 'String!', '{ engagement_id: { _eq: $engagementId } }', engagementId],
      ['contractId', 'String!', '{ contract_id: { _eq: $contractId } }', contractId],
    ],
    '_or',
  );
  const data = await hasuraRequest<{ escrow_transactions: TransitionRow[] }>(
    `query McpEscrowTransitions${where.variableDefinitions} {
       escrow_transactions(${where.whereArgument}, order_by: { created_at: desc }, limit: ${limit}) {
         action from_status to_status tx_hash source created_at
       }
     }`,
    where.variables,
  );
  return data.escrow_transactions;
}

/** public.escrow_pending_actions without the XDR (apps/api services/pending-actions.ts). */
export async function getPendingActions(engagementId: string, action?: string): Promise<PendingActionRow[]> {
  const where = buildWhere([
    ['engagementId', 'String!', '{ engagement_id: { _eq: $engagementId } }', engagementId],
    ['action', 'String!', '{ action: { _eq: $action } }', action],
  ]);
  const data = await hasuraRequest<{ escrow_pending_actions: PendingActionRow[] }>(
    `query McpPendingActions${where.variableDefinitions} {
       escrow_pending_actions(${where.whereArgument}, order_by: { created_at: desc }, limit: 20) {
         id action status tx_hash contract_id signer_address created_at expires_at submitted_at confirmed_at
       }
     }`,
    where.variables,
  );
  return data.escrow_pending_actions;
}

/** Status of the Trustless Work mirror row (public.trustless_work_escrows). */
export async function getTrustlessWorkMirrorStatus(contractId: string | null): Promise<string | null> {
  if (!contractId) return null;
  const data = await hasuraRequest<{ trustlessWorkEscrows: Array<{ status: string }> }>(
    `query McpTwMirror($contractId: String!) {
       trustlessWorkEscrows(where: { contractId: { _eq: $contractId } }, limit: 1) { status }
     }`,
    { contractId },
  );
  return data.trustlessWorkEscrows[0]?.status ?? null;
}

/**
 * The reconciler (POST /reconciliation/sync-escrows) logs a row with
 * source = 'reconciler' only when it changes something, so this is "last
 * correction", not "last run".
 */
export async function getLastReconcilerWrite(): Promise<{ created_at: string; engagement_id: string | null } | null> {
  const data = await hasuraRequest<{ escrow_transactions: Array<{ created_at: string; engagement_id: string | null }> }>(
    `query McpLastReconcilerWrite {
       escrow_transactions(where: { source: { _eq: "reconciler" } }, order_by: { created_at: desc }, limit: 1) {
         created_at engagement_id
       }
     }`,
  );
  return data.escrow_transactions[0] ?? null;
}

/* ─────────────────────────────── booking terms ──────────────────────────── */

export type ApartmentTerms = {
  apartment: {
    id: string;
    name: string;
    owner_id: string;
    warranty_deposit: string | number | null;
    price: string | number | null;
    is_available: boolean | null;
    available_from: string | null;
    available_until: string | null;
  } | null;
  hostWallet: string | null;
};

/** apps/api services/apartment-escrow-terms.ts getApartmentEscrowTerms. */
export async function getApartmentTerms(apartmentId: string): Promise<ApartmentTerms> {
  const apt = await hasuraRequest<{ apartments_by_pk: ApartmentTerms['apartment'] }>(
    `query McpApartmentTerms($id: uuid!) {
       apartments_by_pk(id: $id) {
         id name owner_id warranty_deposit price is_available available_from available_until
       }
     }`,
    { id: apartmentId },
  );
  if (!apt.apartments_by_pk) return { apartment: null, hostWallet: null };
  const wallets = await hasuraRequest<{ user_wallets: Array<{ wallet_address: string }> }>(
    `query McpOwnerPrimaryWallet($userId: String!) {
       user_wallets(where: { user_id: { _eq: $userId }, is_primary: { _eq: true } }, limit: 1) { wallet_address }
     }`,
    { userId: apt.apartments_by_pk.owner_id },
  );
  return { apartment: apt.apartments_by_pk, hostWallet: wallets.user_wallets[0]?.wallet_address ?? null };
}

export type HotelReservationRow = {
  id: string;
  wallet_address: string | null;
  reservation_status: string;
  total_amount: number | string | null;
  check_in: string | null;
  check_out: string | null;
  room: {
    room_number: string;
    hotel: {
      id: string;
      name: string;
      owner: { firebase_uid: string | null; wallets: Array<{ wallet_address: string }> };
    };
  } | null;
};

/** apps/api services/hotel-reservation-escrow.ts getHotelReservation (owner e-mail left out). */
export async function getHotelReservation(reservationId: string): Promise<HotelReservationRow | null> {
  const data = await hasuraRequest<{ reservations_by_pk: HotelReservationRow | null }>(
    `query McpHotelReservation($id: uuid!) {
       reservations_by_pk(id: $id) {
         id wallet_address reservation_status total_amount check_in check_out
         room {
           room_number
           hotel {
             id name
             owner {
               firebase_uid
               wallets(where: { is_primary: { _eq: true }, chain_type: { _eq: "STELLAR" } }, order_by: [{ updated_at: desc }, { id: asc }], limit: 1) { wallet_address }
             }
           }
         }
       }
     }`,
    { id: reservationId },
  );
  return data.reservations_by_pk;
}

/** Is this wallet registered to a hotel user (apps/api getHotelUserWallets, inverted)? */
export async function isHotelWalletRegistered(walletAddress: string): Promise<boolean> {
  const data = await hasuraRequest<{ users_wallets: Array<{ wallet_address: string }> }>(
    `query McpHotelWalletRegistered($wallet: String!) {
       users_wallets(where: { wallet_address: { _eq: $wallet }, chain_type: { _eq: "STELLAR" } }, limit: 1) { wallet_address }
     }`,
    { wallet: walletAddress },
  );
  return data.users_wallets.length > 0;
}

/** Is this wallet registered to any SafeTrust user (public.user_wallets)? */
export async function isWalletRegistered(walletAddress: string): Promise<boolean> {
  const data = await hasuraRequest<{ user_wallets: Array<{ wallet_address: string }> }>(
    `query McpWalletRegistered($wallet: String!) {
       user_wallets(where: { wallet_address: { _eq: $wallet } }, limit: 1) { wallet_address }
     }`,
    { wallet: walletAddress },
  );
  return data.user_wallets.length > 0;
}
