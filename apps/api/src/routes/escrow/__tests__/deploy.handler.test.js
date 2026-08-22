import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployEscrowHandler } from '../deploy.handler.js';

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

describe('deployEscrowHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    );

    expect(res._status).toBe(400);
  });

  it('returns 400 when senderAddress is missing', async () => {
    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', receiverAddress: 'GOWNER', amount: 1200 }),
      res,
    );

    expect(res._status).toBe(400);
  });

  it('calls TrustlessWork with correct payload', async () => {
    vi.mocked(trustlessWorkRequest).mockResolvedValueOnce({
      status: 'SUCCESS',
      contractId: 'CONTRACT_001',
      unsignedTransaction: 'AAAA...XDR',
      message: 'Escrow deployed successfully',
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({
        apartmentId: 'APT001',
        senderAddress: 'GTENANT111',
        receiverAddress: 'GOWNER111',
        amount: 1200,
      }),
      res,
    );

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
  });
});
