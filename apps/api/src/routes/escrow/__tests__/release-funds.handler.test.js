import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../build-escrow-action.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildEscrowAction: vi.fn() };
});

import { ApiError } from '../../../http/api-error.js';
import { buildEscrowAction } from '../build-escrow-action.js';
import { releaseFundsHandler } from '../release-funds.handler.js';
import { mockNext, mockReq, mockRes } from './helpers.js';

const mockBuildEscrowAction = vi.mocked(buildEscrowAction);
const authedReq = (body) => ({ ...mockReq(body), user: { uid: 'guest-uid' } });

describe('releaseFundsHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards 401 when the caller is not authenticated', async () => {
    const next = mockNext();
    await releaseFundsHandler(mockReq({ engagementId: 'e1' }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('forwards 400 when engagementId is missing', async () => {
    const next = mockNext();
    await releaseFundsHandler(authedReq({}), mockRes(), next);

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_ENGAGEMENT_ID' });
  });

  it('builds a release action from the authorized guest wallet', async () => {
    const result = { unsignedXdr: 'RELEASE_XDR_001', txHash: 'hash-789' };
    mockBuildEscrowAction.mockResolvedValueOnce(result);

    const res = mockRes();
    await releaseFundsHandler(authedReq({ engagementId: 'eng-1' }), res, mockNext());

    expect(res._body).toEqual(result);
    const [options] = mockBuildEscrowAction.mock.calls[0];
    expect(options).toMatchObject({ uid: 'guest-uid', engagementId: 'eng-1', action: 'release_funds' });
    expect(options.request({ signer: 'GUEST_WALLET', escrow: { contract_id: 'CAZT001' } })).toEqual({
      path: '/escrow/single-release/release-funds',
      body: { contractId: 'CAZT001', releaseSigner: 'GUEST_WALLET' },
      payload: { releaseSigner: 'GUEST_WALLET' },
    });
  });

  it('forwards action errors to the global error middleware', async () => {
    const error = new ApiError(409, 'INVALID_ESCROW_STATE', 'Escrow is not approved.');
    mockBuildEscrowAction.mockRejectedValueOnce(error);
    const next = mockNext();

    await releaseFundsHandler(authedReq({ engagementId: 'eng-1' }), mockRes(), next);

    expect(next.error).toBe(error);
  });
});
