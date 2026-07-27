import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeMilestoneStatusHandler } from '../milestone-status.handler.js';

vi.mock('../../../lib/trustlesswork.js', () => ({
  trustlessWork: { post: vi.fn() },
}));

import { trustlessWork } from '../../../lib/trustlesswork.js';
import { mockReq, mockRes } from './helpers.js';

describe('changeMilestoneStatusHandler', () => {

  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contractId is missing', async () => {
    const res = mockRes();
    await changeMilestoneStatusHandler(
      mockReq({ milestoneIndex: 0, newEvidence: 'done', newStatus: 'completed', serviceProvider: 'GOWNER' }),
      res,
    );
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('contractId');
  });

  it('returns 400 when newEvidence is missing', async () => {
    const res = mockRes();
    await changeMilestoneStatusHandler(
      mockReq({ contractId: 'CAZT001', milestoneIndex: 0, newStatus: 'completed', serviceProvider: 'GOWNER' }),
      res,
    );
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('newEvidence');
  });

  it('returns 400 when serviceProvider is missing', async () => {
    const res = mockRes();
    await changeMilestoneStatusHandler(
      mockReq({ contractId: 'CAZT001', milestoneIndex: 0, newEvidence: 'done', newStatus: 'completed' }),
      res,
    );
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('serviceProvider');
  });

  it('calls TrustlessWork with correct milestone payload including milestoneIndex', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'MILESTONE_XDR_001' },
    });

    await changeMilestoneStatusHandler(
      mockReq({
        contractId: 'CAZT001',
        milestoneIndex: 0,
        newEvidence: 'Rental period completed',
        newStatus: 'completed',
        serviceProvider: 'GOWNER111',
      }),
      mockRes(),
    );

    expect(trustlessWork.post).toHaveBeenCalledWith(
      '/escrow/single-release/change-milestone-status',
      {
        contractId: 'CAZT001',
        milestoneIndex: 0,
        newEvidence: 'Rental period completed',
        newStatus: 'completed',
        serviceProvider: 'GOWNER111',
      },
    );
  });

  it('returns 201 with unsignedTransaction on success', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'MILESTONE_XDR_001' },
    });

    const res = mockRes();
    await changeMilestoneStatusHandler(
      mockReq({
        contractId: 'CAZT001',
        milestoneIndex: 0,
        newEvidence: 'done',
        newStatus: 'completed',
        serviceProvider: 'GOWNER',
      }),
      res,
    );

    expect(res._status).toBe(201);
    expect(res._body).toEqual({ unsignedTransaction: 'MILESTONE_XDR_001' });
  });

  it('returns 500 on TrustlessWork network failure', async () => {
    trustlessWork.post.mockRejectedValueOnce(new Error('Timeout'));

    const res = mockRes();
    await changeMilestoneStatusHandler(
      mockReq({
        contractId: 'CAZT001',
        milestoneIndex: 0,
        newEvidence: 'done',
        newStatus: 'completed',
        serviceProvider: 'GOWNER',
      }),
      res,
    );

    expect(res._status).toBe(500);
    expect(res._body.error).toBe('Failed to change milestone status');
  });
});