import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../build-escrow-action.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildEscrowAction: vi.fn() };
});

import { ApiError } from '../../../http/api-error.js';
import { buildEscrowAction } from '../build-escrow-action.js';
import { disputeHandler, getDisputeHandler } from '../dispute.handler.js';
import { mockNext, mockReq, mockRes } from './helpers.js';

const mockBuildEscrowAction = vi.mocked(buildEscrowAction);
const authedReq = (body, query = {}) => ({ ...mockReq(body), query, user: { uid: 'guest-uid' } });

describe('disputeHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards 401 when the caller is not authenticated', async () => {
    const next = mockNext();
    await disputeHandler(mockReq({ engagementId: 'e1' }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(mockBuildEscrowAction).not.toHaveBeenCalled();
  });

  it('forwards 400 when engagementId is missing', async () => {
    const next = mockNext();
    await disputeHandler(authedReq({}), mockRes(), next);

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_ENGAGEMENT_ID' });
  });

  it('builds a dispute action from the authorized party wallet', async () => {
    const result = { unsignedXdr: 'DISPUTE_XDR_001', txHash: 'hash-456' };
    mockBuildEscrowAction.mockResolvedValueOnce(result);

    const res = mockRes();
    await disputeHandler(authedReq({ engagementId: 'eng-1' }), res, mockNext());

    expect(res._status).toBe(200);
    expect(res._body).toEqual(result);
    const [options] = mockBuildEscrowAction.mock.calls[0];
    expect(options).toMatchObject({ uid: 'guest-uid', engagementId: 'eng-1', action: 'dispute' });
    expect(options.request({ signer: 'GUEST_WALLET', escrow: { contract_id: 'CAZT001' } })).toEqual({
      path: '/escrow/single-release/dispute-escrow',
      body: { contractId: 'CAZT001', signer: 'GUEST_WALLET' },
      payload: { signer: 'GUEST_WALLET' },
    });
  });

  it('forwards action errors to the global error middleware', async () => {
    const error = new ApiError(409, 'INVALID_ESCROW_STATE', 'Escrow is not funded.');
    mockBuildEscrowAction.mockRejectedValueOnce(error);
    const next = mockNext();

    await disputeHandler(authedReq({ engagementId: 'eng-1' }), mockRes(), next);

    expect(next.error).toBe(error);
  });

  it('stores reason and description in payload when provided', async () => {
    mockBuildEscrowAction.mockResolvedValueOnce({ unsignedXdr: 'XDR', txHash: 'hash-1' });

    await disputeHandler(
      authedReq({
        engagementId: 'eng-1',
        reason: 'Property not as described',
        description: 'Broken window and heating not working',
      }),
      mockRes(),
      mockNext(),
    );

    const [options] = mockBuildEscrowAction.mock.calls[0];
    expect(options.request({ signer: 'GUEST_WALLET', escrow: { contract_id: 'CA1' } })).toEqual({
      path: '/escrow/single-release/dispute-escrow',
      body: { contractId: 'CA1', signer: 'GUEST_WALLET' },
      payload: {
        signer: 'GUEST_WALLET',
        reason: 'Property not as described',
        description: 'Broken window and heating not working',
      },
    });
  });

  it('rejects description longer than 500 characters', async () => {
    const next = mockNext();
    await disputeHandler(
      authedReq({
        engagementId: 'eng-1',
        reason: 'Other',
        description: 'a'.repeat(501),
      }),
      mockRes(),
      next,
    );

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_DESCRIPTION' });
  });

  it('getDisputeHandler requires engagementId or contractId', async () => {
    const next = mockNext();
    await getDisputeHandler(authedReq({}, {}), mockRes(), next);

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
  });
});
