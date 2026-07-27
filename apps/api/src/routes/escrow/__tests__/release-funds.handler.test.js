import { describe, it, expect, vi, beforeEach } from 'vitest';
import { releaseFundsHandler } from '../release-funds.handler.js';

vi.mock('../../../lib/trustlesswork.js', () => ({
  trustlessWork: { post: vi.fn() },
}));

import { trustlessWork } from '../../../lib/trustlesswork.js';

const mockRes = () => {
  const res = {};
  res._status = undefined;
  res._body = undefined;
  res.status = (status) => {
    res._status = status;
    return res;
  };
  res.json = (body) => {
    res._body = body;
    return res;
  };
  return res;
};

describe('releaseFundsHandler', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 400 when contractId is missing', async () => {
    const res = mockRes();
    await releaseFundsHandler({ body: { releaseSigner: 'GRELEASER' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('contractId');
    expect(trustlessWork.post).not.toHaveBeenCalled();
  });

  it('returns 400 when releaseSigner is missing', async () => {
    const res = mockRes();
    await releaseFundsHandler({ body: { contractId: 'CAZT001' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('releaseSigner');
    expect(trustlessWork.post).not.toHaveBeenCalled();
  });

  it('calls TrustlessWork /escrow/single-release/release-funds with correct body', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'RELEASE_XDR_001' },
    });

    await releaseFundsHandler(
      { body: { contractId: 'CAZT001', releaseSigner: 'GRELEASER' } },
      mockRes(),
    );

    expect(trustlessWork.post).toHaveBeenCalledWith(
      '/escrow/single-release/release-funds',
      { contractId: 'CAZT001', releaseSigner: 'GRELEASER' },
    );
  });

  it('returns 201 with unsignedTransaction on success', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'RELEASE_XDR_001' },
    });

    const res = mockRes();
    await releaseFundsHandler(
      { body: { contractId: 'CAZT001', releaseSigner: 'GRELEASER' } },
      res,
    );

    expect(res._status).toBe(201);
    expect(res._body).toEqual({ unsignedTransaction: 'RELEASE_XDR_001' });
  });

  it('returns 500 on TrustlessWork network failure', async () => {
    trustlessWork.post.mockRejectedValueOnce(new Error('Network timeout'));

    const res = mockRes();
    await releaseFundsHandler(
      { body: { contractId: 'CAZT001', releaseSigner: 'GRELEASER' } },
      res,
    );

    expect(res._status).toBe(500);
    expect(res._body.error).toBe('Failed to release funds');
  });
});
