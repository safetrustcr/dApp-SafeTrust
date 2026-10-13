import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployEscrowHandler } from '../deploy.handler.js';

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
}));

vi.mock('../../../services/hotel-reservation-escrow.js', () => ({ getHotelReservationEscrowTerms: vi.fn() }));

vi.mock('../../../services/idempotency.js', () => ({
  checkIdempotency: vi.fn(),
}));

vi.mock('../../../services/hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));
vi.mock('../../../services/apartment-escrow-terms.js', () => ({
  getApartmentEscrowTerms: vi.fn(),
  ApartmentTermsError: class extends Error {},
}));
vi.mock('../../../services/escrow-authz.js', () => ({ getUserWallets: vi.fn() }));
vi.mock('../../../services/pending-actions.js', () => ({
  findLiveAction: vi.fn(),
  insertPendingAction: vi.fn(),
}));
vi.mock('../../../lib/stellar-xdr.js', () => ({
  transactionHash: vi.fn(),
  transactionExpiry: vi.fn(),
}));

import { getHotelReservationEscrowTerms } from '../../../services/hotel-reservation-escrow.js';
import { checkIdempotency } from '../../../services/idempotency.js';
import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { hasuraRequest } from '../../../services/hasura.js';
import { getApartmentEscrowTerms } from '../../../services/apartment-escrow-terms.js';
import { getUserWallets } from '../../../services/escrow-authz.js';
import { findLiveAction, insertPendingAction } from '../../../services/pending-actions.js';
import { transactionExpiry, transactionHash } from '../../../lib/stellar-xdr.js';
import { mockReq, mockRes, mockNext } from './helpers.js';

describe('deployEscrowHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasuraRequest).mockResolvedValue({});
    vi.mocked(getApartmentEscrowTerms).mockResolvedValue({
      apartmentId: 'APT001', ownerUserId: 'host-uid', receiverAddress: 'GOWNER111', amount: 1200,
    });
    vi.mocked(getUserWallets).mockResolvedValue(['GTENANT111']);
    vi.mocked(findLiveAction).mockResolvedValue(null);
    vi.mocked(insertPendingAction).mockResolvedValue({});
    vi.mocked(transactionHash).mockReturnValue('transaction-hash');
    vi.mocked(transactionExpiry).mockReturnValue(new Date('2030-01-01T00:00:00.000Z'));
    process.env.PLATFORM_STELLAR_ADDRESS = 'GPLATFORM111111111111111111111111111111111111111111111111';
    process.env.NEXT_PUBLIC_PLATFORM_ADDRESS = 'GPLATFORM111111111111111111111111111111111111111111111111';
    process.env.USDC_TRUSTLINE_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR2JQTMZ35MIFUQ5IQSQ9CQBZ8JMXKDPE';
    process.env.NEXT_PUBLIC_USDC_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR2JQTMZ35MIFUQ5IQSQ9CQBZ8JMXKDPE';
  });

  it('returns 400 when apartmentId is missing', async () => {
    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ senderAddress: 'GTENANT', receiverAddress: 'GOWNER', amount: 1200 }),
      res,
      mockNext(),
    );
    expect(res._status).toBe(400);
  });

  it('returns 400 when senderAddress is missing', async () => {
    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', receiverAddress: 'GOWNER', amount: 1200 }),
      res,
      mockNext(),
    );
    expect(res._status).toBe(400);
  });

  it('calls TrustlessWork with correct payload', async () => {
    vi.mocked(checkIdempotency).mockResolvedValueOnce({ exists: false });
    vi.mocked(trustlessWorkRequest).mockResolvedValueOnce({
      status: 'SUCCESS',
      contractId: 'CONTRACT_001',
      unsignedTransaction: 'AAAA...XDR',
      message: 'Escrow deployed successfully',
    });

    const res = mockRes();
    const next = mockNext();
    await deployEscrowHandler(
      { ...mockReq({
        apartmentId: 'APT001',
        senderAddress: 'GTENANT111',
      }), user: { uid: 'guest-uid' } },
      res,
      next,
    );

    // If asyncHandler forwarded an error to next, surface it for easier debugging
    if (next.error != null) throw next.error;

    expect(trustlessWorkRequest).toHaveBeenCalledWith(
      '/deployer/single-release',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          signer: 'GTENANT111',
          amount: 1200,
        }),
      }),
    );
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      status: 'SUCCESS',
      contractId: 'CONTRACT_001',
      unsignedXDR: 'AAAA...XDR',
    });
    expect(insertPendingAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'initialize', built_for_uid: 'guest-uid', signer_address: 'GTENANT111',
    }));
  });
});


describe('hotel deployment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasuraRequest).mockResolvedValue({});
    vi.mocked(insertPendingAction).mockResolvedValue({});
    vi.mocked(transactionHash).mockReturnValue('hotel-hash');
    vi.mocked(transactionExpiry).mockReturnValue(new Date('2030-01-01T00:00:00Z'));
    process.env.PLATFORM_STELLAR_ADDRESS = 'GPLATFORM';
    process.env.USDC_TRUSTLINE_ADDRESS = 'GISSUER';
  });
  it('ignores browser amounts and receivers and persists a reservation rather than an apartment', async () => {
    const reservationId = '550e8400-e29b-41d4-a716-446655440001';
    vi.mocked(getHotelReservationEscrowTerms).mockResolvedValue({ amount: 240, receiverAddress: 'GHOTEL', engagementId: `hotel:${reservationId}`, reservation: { id: reservationId } });
    vi.mocked(checkIdempotency).mockResolvedValue({ exists: false });
    vi.mocked(trustlessWorkRequest).mockResolvedValue({ status: 'SUCCESS', contractId: 'CONTRACT', unsignedTransaction: 'XDR' });
    const res = mockRes();
    const next = mockNext();
    await deployEscrowHandler({ ...mockReq({ reservationId, senderAddress: 'GGUEST', amount: 1, receiverAddress: 'GATTACKER' }), user: { uid: 'guest' } }, res, next);
    if (next.error) throw next.error;
    expect(getHotelReservationEscrowTerms).toHaveBeenCalledWith(reservationId, 'guest', 'GGUEST');
    expect(trustlessWorkRequest).toHaveBeenLastCalledWith('/deployer/single-release', expect.objectContaining({ body: expect.objectContaining({ amount: 240, roles: expect.objectContaining({ receiver: 'GHOTEL' }) }) }));
    expect(hasuraRequest).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ apartmentId: null, propertyId: reservationId, tenantId: 'hotel_industry', amount: 240 }));
    expect(insertPendingAction).toHaveBeenLastCalledWith(expect.objectContaining({ engagement_id: `hotel:${reservationId}`, payload: expect.objectContaining({ reservationId, tenantId: 'hotel_industry', releaser: 'GGUEST' }) }));
  });
  it('rejects mixed apartment and reservation identifiers before deployment', async () => {
    vi.mocked(trustlessWorkRequest).mockClear();
    const res = mockRes();
    await deployEscrowHandler({ ...mockReq({ reservationId: 'reservation', apartmentId: 'apartment', senderAddress: 'GGUEST' }), user: { uid: 'guest' } }, res, mockNext());
    expect(res._status).toBe(400);
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });
});
