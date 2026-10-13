import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployEscrowHandler } from '../deploy.handler.js';

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
}));

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
