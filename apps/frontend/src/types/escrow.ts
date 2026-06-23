// Shape returned by GET_ESCROW_BY_ID (escrows_by_pk).
// Mirrors apps/frontend/src/graphql/queries/escrow-queries.ts

export type EscrowApartmentAddress = {
  street?: string;
  neighborhood?: string;
  city?: string;
} | null;

export type EscrowWallet = {
  wallet_address: string;
};

export type EscrowApartmentOwner = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country_code?: string | null;
  // Primary Stellar wallet (user_wallets where is_primary = true). The `id`
  // field is the Firebase UID, not a blockchain address, so on-chain flows
  // must use this instead.
  user_wallets?: EscrowWallet[] | null;
};

export type EscrowApartment = {
  id: string;
  name: string;
  description?: string | null;
  image_urls?: string[] | null;
  price: number;
  warranty_deposit?: number | null;
  address?: EscrowApartmentAddress;
  available_from?: string | null;
  available_until?: string | null;
  owner?: EscrowApartmentOwner | null;
};

export type EscrowDetail = {
  id: string;
  contract_id?: string | null;
  engagement_id?: string | null;
  amount: number;
  status: string;
  created_at: string;
  updated_at?: string | null;
  sender_address?: string | null;
  receiver_address?: string | null;
  apartment?: EscrowApartment | null;
};

export type GetEscrowByIdResult = {
  escrows_by_pk: EscrowDetail | null;
};
