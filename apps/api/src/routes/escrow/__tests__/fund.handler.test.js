import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../build-escrow-action.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildEscrowAction: vi.fn() };
});

import { ApiError } from '../../../http/api-error.js';
import { buildEscrowAction } from '../build-escrow-action.js';
import { fundEscrowHandler } from '../fund.handler.js';
import { mockNext, mockReq, mockRes } from './helpers.js';

const mockBuildEscrowAction = vi.mocked(buildEscrowAction);
const authedReq = (body) => ({ ...mockReq(body), user: { uid: 'guest-uid' } });

describe('fundEscrowHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards 401 when the caller is not authenticated', async () => {
    const next = mockNext();
    await fundEscrowHandler(mockReq({ engagementId: 'e1' }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(mockBuildEscrowAction).not.toHaveBeenCalled();
  });

  it('forwards 400 when engagementId is missing', async () => {
    const next = mockNext();
    await fundEscrowHandler(authedReq({}), mockRes(), next);

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_ENGAGEMENT_ID' });
  });

  it('builds a fund action from server-derived escrow details', async () => {
    const result = { unsignedXdr: 'FUND_XDR_001', txHash: 'hash-123' };
    mockBuildEscrowAction.mockResolvedValueOnce(result);

    const res = mockRes();
    await fundEscrowHandler(authedReq({ engagementId: 'e1' }), res, mockNext());

    expect(res._status).toBe(200);
    expect(res._body).toEqual(result);
    const [options] = mockBuildEscrowAction.mock.calls[0];
    expect(options).toMatchObject({ uid: 'guest-uid', engagementId: 'e1', action: 'fund' });
    expect(options.request({ signer: 'GUEST_WALLET', escrow: { contract_id: 'CAZT001', amount: '950' } }))
      .toEqual({
        path: '/escrow/single-release/fund-escrow',
        body: { contractId: 'CAZT001', signer: 'GUEST_WALLET', amount: 950 },
        payload: { amount: 950 },
      });
  });

  it('forwards an action error to the global error middleware', async () => {
    const error = new ApiError(409, 'INVALID_ESCROW_STATE', 'Escrow cannot be funded.');
    mockBuildEscrowAction.mockRejectedValueOnce(error);
    const next = mockNext();

    await fundEscrowHandler(authedReq({ engagementId: 'e1' }), mockRes(), next);

    expect(next.error).toBe(error);
  });
});
