import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fundEscrowHandler } from '../fund.handler.js';

vi.mock('../../../lib/trustlesswork.js', () => ({
  trustlessWork: { post: vi.fn() },
}));

import { trustlessWork } from '../../../lib/trustlesswork.js';
import { mockReq, mockRes } from './helpers.js';

describe('fundEscrowHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contractId is missing', async () => {
    const res = mockRes();
    await fundEscrowHandler(mockReq({ signer: 'GSIGNER', amount: 1200 }), res);

    expect(res._status).toBe(400);
    expect(res._body.error).toContain('contractId');
  });

  it('returns 400 when signer is missing', async () => {
    const res = mockRes();
    await fundEscrowHandler(mockReq({ contractId: 'CAZT001', amount: 1200 }), res);

    expect(res._status).toBe(400);
    expect(res._body.error).toContain('signer');
  });

  it('returns 400 when amount is missing', async () => {
    const res = mockRes();
    await fundEscrowHandler(mockReq({ contractId: 'CAZT001', signer: 'GSIGNER' }), res);

    expect(res._status).toBe(400);
    expect(res._body.error).toContain('amount');
  });

  it('calls TrustlessWork /escrow/single-release/fund-escrow with correct body', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'FUND_XDR_001' },
    });

    await fundEscrowHandler(
      mockReq({ contractId: 'CAZT001', signer: 'GSIGNER', amount: 950 }),
      mockRes(),
    );

    expect(trustlessWork.post).toHaveBeenCalledWith(
      '/escrow/single-release/fund-escrow',
      { contractId: 'CAZT001', signer: 'GSIGNER', amount: 950 },
    );
  });

  it('returns 201 with unsignedTransaction on success', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'FUND_XDR_001' },
    });

    const res = mockRes();
    await fundEscrowHandler(
      mockReq({ contractId: 'CAZT001', signer: 'GSIGNER', amount: 950 }),
      res,
    );

    expect(res._status).toBe(201);
    expect(res._body).toEqual({ unsignedTransaction: 'FUND_XDR_001' });
  });

  it('returns 500 on TrustlessWork network failure', async () => {
    trustlessWork.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = mockRes();
    await fundEscrowHandler(
      mockReq({ contractId: 'CAZT001', signer: 'GSIGNER', amount: 950 }),
      res,
    );

    expect(res._status).toBe(500);
    expect(res._body.error).toBe('Failed to fund escrow');
  });
});
