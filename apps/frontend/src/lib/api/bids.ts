import { getAuthenticatedApi, postAuthenticatedApi } from './client';

export const BID_STATUSES = [
  'PENDING',
  'VIEWED',
  'APPROVED',
  'CONFIRMED',
  'ESCROW_FUNDED',
  'ESCROW_COMPLETED',
  'CANCELLED',
] as const;

export type BidStatus = (typeof BID_STATUSES)[number];

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

export type BidRequest = {
  id: string;
  apartment_id: string;
  tenant_id: string;
  current_status: BidStatus;
  proposed_price: number;
  desired_move_in: string;
  created_at: string;
  updated_at: string;
  apartment?: BidApartmentSummary | null;
};

export type BidStatusHistory = {
  id: string;
  bid_request_id: string;
  status: BidStatus;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
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

export type ListApartmentBidsResponse = {
  apartment: BidApartmentSummary;
  offers: HostBidOffer[];
  totalCount: number;
  limit: number;
  offset: number;
};

export type ListMyBidsResponse = {
  bids: BidRequest[];
  totalCount: number;
  limit: number;
  offset: number;
};

export type UpdateBidStatusResponse = {
  bid: BidRequest;
  history: BidStatusHistory;
};

export async function createBid(input: {
  apartmentId: string;
  proposedPrice: number;
  desiredMoveIn: string;
}): Promise<{ bid: BidRequest }> {
  return postAuthenticatedApi<{ bid: BidRequest }>('/api/bids', input);
}

export async function getMyBids(params?: {
  apartmentId?: string;
  status?: BidStatus;
  limit?: number;
  offset?: number;
}): Promise<ListMyBidsResponse> {
  const qs = new URLSearchParams();
  if (params?.apartmentId) qs.set('apartmentId', params.apartmentId);
  if (params?.status) qs.set('status', params.status);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return getAuthenticatedApi<ListMyBidsResponse>(`/api/bids/mine${suffix}`);
}

export async function getApartmentBids(
  apartmentId: string,
  params?: {
    status?: BidStatus | 'ALL';
    limit?: number;
    offset?: number;
  },
): Promise<ListApartmentBidsResponse> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return getAuthenticatedApi<ListApartmentBidsResponse>(
    `/api/bids/apartment/${encodeURIComponent(apartmentId)}${suffix}`,
  );
}

export async function acceptBid(
  bidId: string,
  notes?: string,
): Promise<UpdateBidStatusResponse> {
  return postAuthenticatedApi<UpdateBidStatusResponse>(
    `/api/bids/${encodeURIComponent(bidId)}/accept`,
    notes ? { notes } : {},
  );
}

export async function rejectBid(
  bidId: string,
  notes?: string,
): Promise<UpdateBidStatusResponse> {
  return postAuthenticatedApi<UpdateBidStatusResponse>(
    `/api/bids/${encodeURIComponent(bidId)}/reject`,
    notes ? { notes } : {},
  );
}
