import { describe, it, expect, vi, beforeEach } from 'vitest';
import { releaseFundsHandler } from '../release-funds.handler.js';

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
}));

import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { assertEscrowActionAllowed } from '../../../services/escrow-db.js';
import { InvalidTransitionError } from '../../../domain/escrow-state.js';
import { mockReq, mockRes } from './helpers.js';

vi.mock('../../../services/escrow-db.js', () => ({
  assertEscrowActionAllowed: vi.fn(async () => {}),
}));

describe('releaseFundsHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contractId is missing', async () => {
    const res = mockRes();
    await releaseFundsHandler(mockReq({ releaseSigner: 'GRELEASER' }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('contractId');
  });

  it('returns 400 when releaseSigner is missing', async () => {
    const res = mockRes();
    await releaseFundsHandler(mockReq({ contractId: 'CAZT001' }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('releaseSigner');
  });

  it('calls the documented TrustlessWork release endpoint with correct body', async () => {
    vi.mocked(trustlessWorkRequest).mockResolvedValueOnce({
      unsignedXdr: 'RELEASE_XDR_001',
      txHash: 'hash-789',
    });

    const res = mockRes();
    await releaseFundsHandler(
      mockReq({ contractId: 'CAZT001', releaseSigner: 'GRELEASER', engagementId: 'eng-1' }),
      res,
    );

    expect(trustlessWorkRequest).toHaveBeenCalledWith(
      '/escrow/single-release/release-funds',
      {
        method: 'POST',
        body: { contractId: 'CAZT001', releaseSigner: 'GRELEASER' },
      },
    );
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      unsignedXdr: 'RELEASE_XDR_001',
      contractId: 'CAZT001',
      status: 'completed',
    });
  });

  it('returns 409 and skips Trustless Work when the escrow was not milestone-approved', async () => {
    vi.mocked(assertEscrowActionAllowed).mockRejectedValueOnce(
      new InvalidTransitionError('funded', 'completed', 'release_funds'),
    );

    const res = mockRes();
    await releaseFundsHandler(
      mockReq({ contractId: 'CAZT001', releaseSigner: 'GRELEASER', engagementId: 'eng-1' }),
      res,
    );

    expect(res._status).toBe(409);
    expect(res._body).toEqual({
      error: 'invalid escrow transition funded -> completed',
      from: 'funded',
      to: 'completed',
    });
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });
});
