import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../build-escrow-action.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildEscrowAction: vi.fn() };
});

import { ApiError } from '../../../http/api-error.js';
import { buildEscrowAction } from '../build-escrow-action.js';
import { resolveDisputeHandler } from '../resolve-dispute.handler.js';
import { mockNext, mockReq, mockRes } from './helpers.js';

const mockBuildEscrowAction = vi.mocked(buildEscrowAction);
const authedReq = (body) => ({ ...mockReq(body), user: { uid: 'admin-uid' } });

describe('resolveDisputeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildEscrowAction.mockImplementation(async ({ request }) => {
      return request({
        signer: 'PLATFORM_WALLET',
        escrow: { contract_id: 'CA1', amount: 100 },
        roles: {
          approver: 'GUEST_WALLET',
          serviceProvider: 'HOST_WALLET',
          releaseSigner: 'PLATFORM_WALLET',
          disputeResolver: 'PLATFORM_WALLET',
        },
      }) as never;
    });
  });

  it('forwards 401 when the caller is not authenticated', async () => {
    const next = mockNext();
    await resolveDisputeHandler(mockReq({ engagementId: 'e1' }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(mockBuildEscrowAction).not.toHaveBeenCalled();
  });

  it('forwards 400 when engagementId is missing', async () => {
    const next = mockNext();
    await resolveDisputeHandler(authedReq({ distributions: [{ role: 'approver', amount: 100 }] }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_ENGAGEMENT_ID' });
  });

  it('forwards 400 when distributions is missing or empty', async () => {
    const next = mockNext();
    await resolveDisputeHandler(authedReq({ engagementId: 'eng-1' }), mockRes(), next);

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_DISTRIBUTIONS' });
  });

  it('forwards 400 when distribution items lack role or amount', async () => {
    const next = mockNext();
    await resolveDisputeHandler(
      authedReq({
        engagementId: 'eng-1',
        distributions: [{ address: 'G123', amount: 100 }], // old buggy format
      }),
      mockRes(),
      next,
    );

    expect(next.error).toMatchObject({ status: 400, code: 'INVALID_DISTRIBUTIONS' });
  });

  it('forwards 400 when distribution sum does not match escrow amount', async () => {
    const next = mockNext();
    await resolveDisputeHandler(
      authedReq({
        engagementId: 'eng-1',
        distributions: [
          { role: 'approver', amount: 40 },
          { role: 'serviceProvider', amount: 50 },
        ],
      }),
      mockRes(),
      next,
    );

    expect(next.error).toMatchObject({ status: 400, code: 'DISTRIBUTION_MISMATCH' });
  });

  it('builds a resolve action mapping roles to addresses when valid', async () => {
    const result = { unsignedXdr: 'RESOLVE_XDR_001', txHash: 'hash-789' };
    mockBuildEscrowAction.mockImplementationOnce(async ({ request }) => {
      const built = await request({
        signer: 'PLATFORM_WALLET',
        escrow: { contract_id: 'CA1', amount: 100 },
        roles: {
          approver: 'GUEST_WALLET',
          serviceProvider: 'HOST_WALLET',
          releaseSigner: 'PLATFORM_WALLET',
          disputeResolver: 'PLATFORM_WALLET',
        },
      });
      expect(built).toEqual({
        path: '/escrow/single-release/resolve-dispute',
        body: {
          contractId: 'CA1',
          disputeResolver: 'PLATFORM_WALLET',
          distributions: [
            { address: 'GUEST_WALLET', amount: 60 },
            { address: 'HOST_WALLET', amount: 40 },
          ],
        },
        payload: {
          distributions: [
            { address: 'GUEST_WALLET', amount: 60 },
            { address: 'HOST_WALLET', amount: 40 },
          ],
        },
      });
      return result as never;
    });

    const res = mockRes();
    await resolveDisputeHandler(
      authedReq({
        engagementId: 'eng-1',
        distributions: [
          { role: 'approver', amount: 60 },
          { role: 'serviceProvider', amount: 40 },
        ],
      }),
      res,
      mockNext(),
    );

    expect(res._status).toBe(200);
    expect(res._body).toEqual(result);
  });
});
