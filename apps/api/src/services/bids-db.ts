import { ApiError } from '../http/api-error.js';
import { HasuraRequestError, hasuraRequest, isUniqueViolation } from './hasura.js';

export const VALID_BID_STATUSES = [
  'PENDING',
  'VIEWED',
  'APPROVED',
  'CONFIRMED',
  'ESCROW_FUNDED',
  'ESCROW_COMPLETED',
  'CANCELLED',
] as const;

export type BidStatus = (typeof VALID_BID_STATUSES)[number];

export type BidApartmentSummary = {
  id: string;
  owner_id: string;
  name: string;
  price: number;
  warranty_deposit: number;
  address: {
    street?: string;
    neighborhood?: string;
    city?: string;
    country?: string;
  } | null;
  is_available: boolean;
  image_urls?: string[] | null;
};

export type BidRequestRecord = {
  id: string;
  apartment_id: string;
  tenant_id: string;
  current_status: BidStatus;
  proposed_price: number;
  desired_move_in: string;
  created_at: string;
  updated_at: string;
};

export type BidStatusHistoryRecord = {
  id: string;
  bid_request_id: string;
  status: BidStatus;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
};

export type BidWithApartment = BidRequestRecord & {
  apartment: BidApartmentSummary | null;
};

export type HostBidOffer = {
  id: string;
  apartment_id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_wallet_address: string;
  proposed_price: number;
  desired_move_in: string;
  current_status: BidStatus;
  created_at: string;
  updated_at: string;
};

type RawHostBidRow = BidRequestRecord & {
  tenant?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone_number?: string | null;
    country_code?: string | null;
    user_wallets?: Array<{ wallet_address: string }>;
  } | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

export function isValidBidStatus(value: unknown): value is BidStatus {
  return typeof value === 'string' && (VALID_BID_STATUSES as readonly string[]).includes(value);
}

function isActiveBidConstraintError(error: unknown): boolean {
  if (isUniqueViolation(error)) {
    return true;
  }
  if (error instanceof HasuraRequestError) {
    const msg = error.message.toLowerCase();
    return msg.includes('already has an active bid') || msg.includes('ux_bid_requests_one_active_per_tenant');
  }
  return false;
}

function formatTenantName(tenant?: RawHostBidRow['tenant']): string {
  if (!tenant) return 'Guest';
  const full = [tenant.first_name, tenant.last_name].filter(Boolean).join(' ').trim();
  return full || 'Guest';
}

function formatTenantPhone(tenant?: RawHostBidRow['tenant']): string {
  if (!tenant?.phone_number) return '—';
  return [tenant.country_code, tenant.phone_number].filter(Boolean).join(' ').trim();
}

export async function getBidApartment(apartmentId: string): Promise<BidApartmentSummary | null> {
  if (!isValidUuid(apartmentId)) {
    return null;
  }

  const data = await hasuraRequest<{ apartments: BidApartmentSummary[] }>(
    `query GetBidApartment($apartmentId: uuid!) {
      apartments(where: { id: { _eq: $apartmentId }, deleted_at: { _is_null: true } }, limit: 1) {
        id
        owner_id
        name
        price
        warranty_deposit
        address
        is_available
        image_urls
      }
    }`,
    { apartmentId },
  );

  return data.apartments?.[0] ?? null;
}

export async function getBidById(
  bidId: string,
): Promise<(BidRequestRecord & { apartment: { id: string; owner_id: string; name: string } | null }) | null> {
  if (!isValidUuid(bidId)) {
    return null;
  }

  const data = await hasuraRequest<{
    bid_requests: Array<BidRequestRecord & { apartment: { id: string; owner_id: string; name: string } | null }>;
  }>(
    `query GetBidById($bidId: uuid!) {
      bid_requests(where: { id: { _eq: $bidId }, deleted_at: { _is_null: true } }, limit: 1) {
        id
        apartment_id
        tenant_id
        current_status
        proposed_price
        desired_move_in
        created_at
        updated_at
        apartment {
          id
          owner_id
          name
        }
      }
    }`,
    { bidId },
  );

  return data.bid_requests?.[0] ?? null;
}

export async function createBidRequest(input: {
  apartmentId: string;
  tenantId: string;
  proposedPrice: number;
  desiredMoveIn: string;
}): Promise<BidRequestRecord> {
  try {
    const data = await hasuraRequest<{ insert_bid_requests_one: BidRequestRecord | null }>(
      `mutation CreateBidRequest(
        $apartmentId: uuid!
        $tenantId: String!
        $proposedPrice: numeric!
        $desiredMoveIn: timestamptz!
      ) {
        insert_bid_requests_one(
          object: {
            apartment_id: $apartmentId
            tenant_id: $tenantId
            current_status: "PENDING"
            proposed_price: $proposedPrice
            desired_move_in: $desiredMoveIn
          }
        ) {
          id
          apartment_id
          tenant_id
          current_status
          proposed_price
          desired_move_in
          created_at
          updated_at
        }
      }`,
      {
        apartmentId: input.apartmentId,
        tenantId: input.tenantId,
        proposedPrice: input.proposedPrice,
        desiredMoveIn: input.desiredMoveIn,
      },
    );

    if (!data.insert_bid_requests_one) {
      throw new Error('Failed to create bid request');
    }

    return data.insert_bid_requests_one;
  } catch (error) {
    if (isActiveBidConstraintError(error)) {
      throw new ApiError(
        409,
        'ACTIVE_BID_EXISTS',
        'You already have an active offer on a listing. Cancel it before submitting a new one.',
      );
    }
    throw error;
  }
}

export async function listMyBids(input: {
  tenantId: string;
  apartmentId?: string;
  status?: BidStatus;
  limit: number;
  offset: number;
}): Promise<{ bids: BidWithApartment[]; totalCount: number }> {
  const where: Record<string, unknown> = {
    tenant_id: { _eq: input.tenantId },
    deleted_at: { _is_null: true },
  };

  if (input.apartmentId) {
    where.apartment_id = { _eq: input.apartmentId };
  }
  if (input.status) {
    where.current_status = { _eq: input.status };
  }

  const data = await hasuraRequest<{
    bid_requests: BidWithApartment[];
    bid_requests_aggregate: { aggregate: { count: number } };
  }>(
    `query ListMyBids($where: bid_requests_bool_exp!, $limit: Int!, $offset: Int!) {
      bid_requests(
        where: $where
        order_by: [{ created_at: desc }]
        limit: $limit
        offset: $offset
      ) {
        id
        apartment_id
        tenant_id
        current_status
        proposed_price
        desired_move_in
        created_at
        updated_at
        apartment {
          id
          owner_id
          name
          price
          warranty_deposit
          address
          is_available
          image_urls
        }
      }
      bid_requests_aggregate(where: $where) {
        aggregate {
          count
        }
      }
    }`,
    {
      where,
      limit: input.limit,
      offset: input.offset,
    },
  );

  return {
    bids: data.bid_requests ?? [],
    totalCount: data.bid_requests_aggregate?.aggregate?.count ?? 0,
  };
}

export async function listApartmentBids(input: {
  apartmentId: string;
  status?: BidStatus;
  limit: number;
  offset: number;
}): Promise<{ offers: HostBidOffer[]; totalCount: number }> {
  const where: Record<string, unknown> = {
    apartment_id: { _eq: input.apartmentId },
    deleted_at: { _is_null: true },
  };

  if (input.status) {
    where.current_status = { _eq: input.status };
  }

  const data = await hasuraRequest<{
    bid_requests: RawHostBidRow[];
    bid_requests_aggregate: { aggregate: { count: number } };
  }>(
    `query ListApartmentBids($where: bid_requests_bool_exp!, $limit: Int!, $offset: Int!) {
      bid_requests(
        where: $where
        order_by: [{ created_at: desc }]
        limit: $limit
        offset: $offset
      ) {
        id
        apartment_id
        tenant_id
        current_status
        proposed_price
        desired_move_in
        created_at
        updated_at
        tenant {
          id
          first_name
          last_name
          phone_number
          country_code
          user_wallets(
            where: { is_primary: { _eq: true }, chain_type: { _eq: "STELLAR" } }
            order_by: [{ updated_at: desc }, { id: asc }]
            limit: 1
          ) {
            wallet_address
          }
        }
      }
      bid_requests_aggregate(where: $where) {
        aggregate {
          count
        }
      }
    }`,
    {
      where,
      limit: input.limit,
      offset: input.offset,
    },
  );

  const offers: HostBidOffer[] = (data.bid_requests ?? []).map((row) => ({
    id: row.id,
    apartment_id: row.apartment_id,
    tenant_id: row.tenant_id,
    tenant_name: formatTenantName(row.tenant),
    tenant_phone: formatTenantPhone(row.tenant),
    tenant_wallet_address: row.tenant?.user_wallets?.[0]?.wallet_address ?? '—',
    proposed_price: Number(row.proposed_price),
    desired_move_in: row.desired_move_in,
    current_status: row.current_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return {
    offers,
    totalCount: data.bid_requests_aggregate?.aggregate?.count ?? 0,
  };
}

export async function updateBidStatus(input: {
  bidId: string;
  nextStatus: BidStatus;
  allowedFromStatuses: BidStatus[];
  actorId: string;
  notes?: string;
}): Promise<{ bid: BidRequestRecord; history: BidStatusHistoryRecord }> {
  // Single GraphQL mutation document runs both writes in one Postgres transaction,
  // so a failure in insert_bid_status_histories_one rolls back the status update.
  const data = await hasuraRequest<{
    update_bid_requests: { returning: BidRequestRecord[] };
    insert_bid_status_histories_one: BidStatusHistoryRecord | null;
  }>(
    `mutation UpdateBidStatusWithHistory(
      $bidId: uuid!
      $nextStatus: String!
      $allowedFromStatuses: [String!]!
      $changedBy: String!
      $notes: String
    ) {
      update_bid_requests(
        where: {
          id: { _eq: $bidId }
          deleted_at: { _is_null: true }
          current_status: { _in: $allowedFromStatuses }
        }
        _set: { current_status: $nextStatus }
      ) {
        returning {
          id
          apartment_id
          tenant_id
          current_status
          proposed_price
          desired_move_in
          created_at
          updated_at
        }
      }
      insert_bid_status_histories_one(
        object: {
          bid_request_id: $bidId
          status: $nextStatus
          changed_by: $changedBy
          notes: $notes
        }
      ) {
        id
        bid_request_id
        status
        notes
        changed_by
        created_at
      }
    }`,
    {
      bidId: input.bidId,
      nextStatus: input.nextStatus,
      allowedFromStatuses: input.allowedFromStatuses,
      changedBy: input.actorId,
      notes: input.notes ?? null,
    },
  );

  const bid = data.update_bid_requests?.returning?.[0];
  if (!bid) {
    throw new ApiError(
      409,
      'INVALID_BID_TRANSITION',
      'Offer status has changed and cannot be updated.',
    );
  }

  if (!data.insert_bid_status_histories_one) {
    throw new Error('Failed to record bid status history');
  }

  return {
    bid,
    history: data.insert_bid_status_histories_one,
  };
}
