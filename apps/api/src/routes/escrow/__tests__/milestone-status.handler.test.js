import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../build-escrow-action.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildEscrowAction: vi.fn() };
});

import { ApiError } from '../../../http/api-error.js';
import { buildEscrowAction } from '../build-escrow-action.js';
import { milestoneStatusHandler } from '../milestone-status.handler.js';
import { mockNext, mockReq, mockRes } from './helpers.js';

const mockBuildEscrowAction = vi.mocked(buildEscrowAction);
const authedReq = (body) => ({ ...mockReq(body), user: { uid: 'host-uid' } });

describe('milestoneStatusHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards 401 when the caller is not authenticated', async () => {
    const next = mockNext();
    await milestoneStatusHandler(mockReq({ engagementId: 'e1', milestoneIndex: 0 }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('forwards 400 when milestoneIndex is invalid', async () => {
    const next = mockNext();
    await milestoneStatusHandler(authedReq({ engagementId: 'e1', milestoneIndex: -1 }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 400 });
    expect(mockBuildEscrowAction).not.toHaveBeenCalled();
  });

  it('builds a milestone-completion action from the authorized host wallet', async () => {
    const result = { unsignedXdr: 'MILESTONE_XDR_001', txHash: 'hash-456' };
    mockBuildEscrowAction.mockResolvedValueOnce(result);

    const res = mockRes();
    await milestoneStatusHandler(
      authedReq({ engagementId: 'eng-1', milestoneIndex: 0, newEvidence: 'Rental period completed' }),
      res,
      mockNext(),
    );

    expect(res._body).toEqual(result);
    const [options] = mockBuildEscrowAction.mock.calls[0];
    expect(options).toMatchObject({ uid: 'host-uid', engagementId: 'eng-1', action: 'mark_milestone_completed' });
    expect(options.request({ signer: 'HOST_WALLET', escrow: { contract_id: 'CAZT001' } })).toEqual({
      path: '/escrow/single-release/change-milestone-status',
      body: {
        contractId: 'CAZT001',
        serviceProvider: 'HOST_WALLET',
        milestoneIndex: '0',
        newStatus: 'completed',
        newEvidence: 'Rental period completed',
      },
      payload: { milestoneIndex: 0, milestoneId: 'check_in', newStatus: 'completed' },
    });
  });

  it('forwards action errors to the global error middleware', async () => {
    const error = new ApiError(409, 'INVALID_ESCROW_STATE', 'Escrow is not funded.');
    mockBuildEscrowAction.mockRejectedValueOnce(error);
    const next = mockNext();

    await milestoneStatusHandler(authedReq({ engagementId: 'eng-1', milestoneIndex: 0 }), mockRes(), next);

    expect(next.error).toBe(error);
  });
});
