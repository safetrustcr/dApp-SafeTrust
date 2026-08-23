import { describe, it, expect, vi, beforeEach } from 'vitest';
import { milestoneStatusHandler } from '../milestone-status.handler.js';

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

describe('milestoneStatusHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contractId is missing', async () => {
    const res = mockRes();
    await milestoneStatusHandler(
      mockReq({ milestoneIndex: 0, newEvidence: 'done', newStatus: 'completed', serviceProvider: 'GOWNER', engagementId: 'e1' }),
      res,
    );
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('contractId');
  });

  it('calls TrustlessWork with correct milestone payload', async () => {
    vi.mocked(trustlessWorkRequest).mockResolvedValueOnce({
      unsignedXdr: 'MILESTONE_XDR_001',
      txHash: 'hash-456',
    });

    const res = mockRes();
    await milestoneStatusHandler(
      mockReq({
        contractId: 'CAZT001',
        milestoneIndex: 0,
        newEvidence: 'Rental period completed',
        newStatus: 'completed',
        serviceProvider: 'GOWNER111',
        engagementId: 'eng-1',
      }),
      res,
    );

    expect(trustlessWorkRequest).toHaveBeenCalledWith(
      '/escrow/single-release/v2/change-milestone-status',
      {
        method: 'POST',
        body: {
          contractId: 'CAZT001',
          serviceProvider: 'GOWNER111',
          updates: [
            {
              index: 0,
              newStatus: 'completed',
              newEvidence: 'Rental period completed',
            },
          ],
        },
      },
    );
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      unsignedXdr: 'MILESTONE_XDR_001',
      txHash: 'hash-456',
      contractId: 'CAZT001',
      engagementId: 'eng-1',
      status: 'milestone_approved',
    });
  });
});