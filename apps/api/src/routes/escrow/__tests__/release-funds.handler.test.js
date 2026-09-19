import { describe, it, expect, vi, beforeEach } from 'vitest';
import { releaseFundsHandler } from '../release-funds.handler.js';

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
  TrustlessWorkRequestError: class extends Error {
    constructor(message, statusCode, messages, payload) {
      super(message);
      this.statusCode = statusCode;
      this.messages = messages;
      this.payload = payload;
    }
  },
  getErrorMessages: vi.fn((err, fallback) => [err?.message || fallback]),
}));

import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { mockReq, mockRes } from './helpers.js';

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

  it('calls TrustlessWork /escrow/single-release/v2/release-funds with correct body', async () => {
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
      '/escrow/single-release/v2/release-funds',
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
});
