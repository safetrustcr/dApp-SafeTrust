import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../build-escrow-action.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildEscrowAction: vi.fn() };
});

import { buildEscrowAction } from '../build-escrow-action.js';
import { parseShares, resolveDisputeHandler } from '../resolve-dispute.handler.js';
import { mockNext, mockReq, mockRes } from './helpers.js';

const mockBuildEscrowAction = vi.mocked(buildEscrowAction);
const authedReq = (body) => ({ ...mockReq(body), user: { uid: 'admin-uid' } });

describe('parseShares (unit tests including 7-decimal cases)', () => {
  it('throws on non-array or empty distributions', () => {
    expect(() => parseShares(null, 100)).toThrow('distributions must be a non-empty list');
    expect(() => parseShares([], 100)).toThrow('distributions must be a non-empty list');
  });

  it('throws on invalid role or negative amount', () => {
    expect(() => parseShares([{ role: 'invalidRole', amount: 100 }], 100)).toThrow('Each distribution needs role "approver" or "serviceProvider"');
    expect(() => parseShares([{ role: 'approver', amount: -5 }], 100)).toThrow('Each distribution needs role "approver" or "serviceProvider"');
  });

  it('rejects distributions that do not sum to the escrow total', () => {
    expect(() =>
      parseShares(
        [
          { role: 'approver', amount: 50 },
          { role: 'serviceProvider', amount: 40 },
        ],
        100,
      ),
    ).toThrow('Distributions must add up to the escrow amount (100).');
  });

  it('accurately parses splits in 7-decimal units without floating point errors', () => {
    // 0.1 + 0.2 in JS float is 0.30000000000000004
    const shares = parseShares(
      [
        { role: 'approver', amount: 0.1 },
        { role: 'serviceProvider', amount: 0.2 },
      ],
      0.3,
    );
    expect(shares).toEqual([
      { role: 'approver', amount: 0.1 },
      { role: 'serviceProvider', amount: 0.2 },
    ]);
  });

  it('handles exact 7-decimal fractional amounts', () => {
    const total = 100.1234567;
    const approver = 40.123456;
    const host = 60.0000007;

    const shares = parseShares(
      [
        { role: 'approver', amount: approver },
        { role: 'serviceProvider', amount: host },
      ],
      total,
    );
    expect(shares).toHaveLength(2);
    expect(shares[0]).toEqual({ role: 'approver', amount: 40.123456 });
    expect(shares[1]).toEqual({ role: 'serviceProvider', amount: 60.0000007 });
  });

  it('rejects distribution if off by 1 stroop (0.0000001)', () => {
    const total = 100.1234567;
    const approver = 40.123456;
    const host = 60.0000008; // 1 stroop extra

    expect(() =>
      parseShares(
        [
          { role: 'approver', amount: approver },
          { role: 'serviceProvider', amount: host },
        ],
        total,
      ),
    ).toThrow('Distributions must add up to the escrow amount');
  });

  it('filters out 0-amount share when 100% is allocated to one party', () => {
    const shares = parseShares(
      [
        { role: 'approver', amount: 100 },
        { role: 'serviceProvider', amount: 0 },
      ],
      100,
    );
    expect(shares).toEqual([{ role: 'approver', amount: 100 }]);
  });
});

describe('resolveDisputeHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires authentication', async () => {
    const next = mockNext();
    await resolveDisputeHandler(mockReq({ engagementId: 'eng-1' }), mockRes(), next);
    expect(next.error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('builds resolve_dispute action with mapped addresses from escrow roles', async () => {
    const result = { unsignedXdr: 'RESOLVE_XDR_001', txHash: 'tx-res-1' };
    mockBuildEscrowAction.mockResolvedValueOnce(result);

    const res = mockRes();
    await resolveDisputeHandler(
      authedReq({
        engagementId: 'eng-1',
        distributions: [
          { role: 'approver', amount: 70 },
          { role: 'serviceProvider', amount: 30 },
        ],
      }),
      res,
      mockNext(),
    );

    expect(res._status).toBe(200);
    expect(res._body).toEqual(result);

    const [options] = mockBuildEscrowAction.mock.calls[0];
    expect(options).toMatchObject({ uid: 'admin-uid', engagementId: 'eng-1', action: 'resolve_dispute' });

    const reqPayload = options.request({
      signer: 'PLATFORM_RESOLVER_PUBKEY',
      escrow: { contract_id: 'CCONTRACT', amount: 100 },
      roles: { approver: 'GUEST_WALLET_ADDR', serviceProvider: 'HOST_WALLET_ADDR' },
    });

    expect(reqPayload).toEqual({
      path: '/escrow/single-release/resolve-dispute',
      body: {
        contractId: 'CCONTRACT',
        disputeResolver: 'PLATFORM_RESOLVER_PUBKEY',
        distributions: [
          { address: 'GUEST_WALLET_ADDR', amount: 70 },
          { address: 'HOST_WALLET_ADDR', amount: 30 },
        ],
      },
      payload: {
        distributions: [
          { address: 'GUEST_WALLET_ADDR', amount: 70 },
          { address: 'HOST_WALLET_ADDR', amount: 30 },
        ],
      },
    });
  });
});
