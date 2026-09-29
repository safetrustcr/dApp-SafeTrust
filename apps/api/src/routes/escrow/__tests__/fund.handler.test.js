import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fundEscrowHandler } from '../fund.handler.js';

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
}));

import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { mockReq, mockRes, mockNext } from './helpers.js';

describe('fundEscrowHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contractId is missing', async () => {
    const res = mockRes();
    await fundEscrowHandler(mockReq({ signer: 'GSIGNER', amount: 1200, engagementId: 'e1' }), res, mockNext());

    expect(res._status).toBe(400);
    expect(res._body.error).toContain('contractId');
  });

  it('returns 400 when signer is missing', async () => {
    const res = mockRes();
    await fundEscrowHandler(mockReq({ contractId: 'CAZT001', amount: 1200, engagementId: 'e1' }), res, mockNext());

    expect(res._status).toBe(400);
    expect(res._body.error).toContain('signer');
  });

  it('calls the documented TrustlessWork funding endpoint with correct body', async () => {
    vi.mocked(trustlessWorkRequest).mockResolvedValueOnce({
      unsignedXdr: 'FUND_XDR_001',
      txHash: 'hash-123',
    });

    const res = mockRes();
    await fundEscrowHandler(
      mockReq({ contractId: 'CAZT001', signer: 'GSIGNER', amount: 950, engagementId: 'e1' }),
      res,
      mockNext(),
    );

    expect(trustlessWorkRequest).toHaveBeenCalledWith(
      '/escrow/single-release/fund-escrow',
      {
        method: 'POST',
        body: { contractId: 'CAZT001', signer: 'GSIGNER', amount: 950 },
      },
    );
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      unsignedXdr: 'FUND_XDR_001',
      txHash: 'hash-123',
      contractId: 'CAZT001',
      engagementId: 'e1',
    });
  });
});
