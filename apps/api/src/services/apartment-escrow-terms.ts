/**
 * Server-side escrow terms for an apartment: who receives the deposit and how much.
 * deploy.handler.ts uses this instead of trusting receiverAddress / amount from the body.
 *
 * ⚠️ Column names: verify `owner_id` and `warranty_deposit` against
 * infra/backend/migrations/safetrust/1732588166945_create_apartments/up.sql.
 */
import { hasuraRequest } from './hasura.js';

export type ApartmentEscrowTerms = {
  apartmentId: string;
  ownerUserId: string;
  receiverAddress: string;
  amount: number;
};

export class ApartmentTermsError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApartmentTermsError';
  }
}

export async function getApartmentEscrowTerms(apartmentId: string): Promise<ApartmentEscrowTerms> {
  const apt = await hasuraRequest<{
    apartments_by_pk: { id: string; owner_id: string; warranty_deposit: number | string | null } | null;
  }>(
    `query ApartmentEscrowTerms($id: uuid!) {
       apartments_by_pk(id: $id) { id owner_id warranty_deposit }
     }`,
    { id: apartmentId },
  );
  const apartment = apt.apartments_by_pk;
  if (!apartment) throw new ApartmentTermsError(404, 'APARTMENT_NOT_FOUND', 'Apartment not found.');

  const amount = Number(apartment.warranty_deposit);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApartmentTermsError(409, 'APARTMENT_HAS_NO_DEPOSIT', 'This apartment has no deposit configured.');
  }

  const wallets = await hasuraRequest<{ user_wallets: Array<{ wallet_address: string }> }>(
    `query OwnerPrimaryWallet($userId: String!) {
       user_wallets(where: { user_id: { _eq: $userId }, is_primary: { _eq: true } }, limit: 1) { wallet_address }
     }`,
    { userId: apartment.owner_id },
  );
  const receiverAddress = wallets.user_wallets[0]?.wallet_address;
  if (!receiverAddress) {
    throw new ApartmentTermsError(409, 'HOST_WALLET_MISSING', 'The host has not linked a Stellar wallet yet.');
  }

  return { apartmentId: apartment.id, ownerUserId: apartment.owner_id, receiverAddress, amount };
}
