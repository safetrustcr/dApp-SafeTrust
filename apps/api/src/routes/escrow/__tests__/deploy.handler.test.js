import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployEscrowHandler } from '../deploy.handler.js';

vi.mock('../../../lib/trustlesswork.js', () => ({
  trustlessWork: { post: vi.fn() },
}));

vi.mock('../../../services/idempotency.js', () => ({
  checkIdempotency: vi.fn(),
}));

import { trustlessWork } from '../../../lib/trustlesswork.js';
import { checkIdempotency } from '../../../services/idempotency.js';
import { mockReq, mockRes } from './helpers.js';

describe('deployEscrowHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_STELLAR_ADDRESS = 'GPLATFORM111111111111111111111111111111111111111111111111';
    process.env.PLATFORM_FEE_PERCENT = '1';
    checkIdempotency.mockResolvedValue({ exists: false });
  });

  it('returns the cached result and skips TrustlessWork when the engagementId was already deployed', async () => {
    checkIdempotency.mockResolvedValueOnce({
      exists: true,
      result: { engagement_id: 'ENG001', contract_id: 'CONTRACT001', status: 'funded' },
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      unsignedXDR: null,
      engagementId: 'ENG001',
      contractId: 'CONTRACT001',
      cached: true,
    });
    expect(trustlessWork.post).not.toHaveBeenCalled();
  });

  it('returns 400 when apartmentId is missing', async () => {
    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
  });

  it('returns 400 when tenantAddress is missing', async () => {
    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
  });

  it('calls TrustlessWork with correct roles payload', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'AAAA...XDR' },
    });

    await deployEscrowHandler(
      mockReq({
        apartmentId: 'APT001',
        tenantAddress: 'GTENANT111111111111111111111111111111111111111111111111111',
        ownerAddress: 'GOWNER111111111111111111111111111111111111111111111111111',
        amount: 1200,
        engagementId: 'ENG001',
      }),
      mockRes(),
    );

    expect(trustlessWork.post).toHaveBeenCalledWith(
      '/deployer/single-release',
      expect.objectContaining({
        signer: 'GTENANT111111111111111111111111111111111111111111111111111',
        engagementId: 'ENG001',
        amount: 1200,
        roles: expect.objectContaining({
          approver: 'GTENANT111111111111111111111111111111111111111111111111111',
          serviceProvider: 'GOWNER111111111111111111111111111111111111111111111111111',
          receiver: 'GOWNER111111111111111111111111111111111111111111111111111',
          platformAddress: 'GPLATFORM111111111111111111111111111111111111111111111111',
          releaseSigner: 'GTENANT111111111111111111111111111111111111111111111111111',
          disputeResolver: 'GPLATFORM111111111111111111111111111111111111111111111111',
        }),
      }),
    );
  });

  it('returns 200 with unsignedXDR and engagementId on success', async () => {
    trustlessWork.post.mockResolvedValueOnce({
      data: { unsignedTransaction: 'AAAA...XDR' },
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ unsignedXDR: 'AAAA...XDR', engagementId: 'ENG001' });
  });

  it('returns 400 for "amount cannot be zero" TrustlessWork error', async () => {
    trustlessWork.post.mockRejectedValueOnce({
      response: { data: { message: 'amount cannot be zero' } },
      message: 'amount cannot be zero',
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 0, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Amount cannot be zero');
  });

  it('returns 400 for "already initialized" TrustlessWork error', async () => {
    trustlessWork.post.mockRejectedValueOnce({
      response: { data: { message: 'already initialized' } },
      message: 'already initialized',
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Escrow already initialized (duplicate engagementId)');
  });

  it('returns 400 for fee-related TrustlessWork errors', async () => {
    trustlessWork.post.mockRejectedValueOnce({
      response: { data: { message: 'fee cannot exceed 99%' } },
      message: 'fee cannot exceed 99%',
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Platform fee cannot exceed 99%');
  });

  it('returns 400 for milestone-related TrustlessWork errors', async () => {
    trustlessWork.post.mockRejectedValueOnce({
      response: { data: { message: 'without milestone' } },
      message: 'without milestone',
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Escrow initialized without milestone');
  });

  it('returns 400 for milestone count TrustlessWork errors', async () => {
    trustlessWork.post.mockRejectedValueOnce({
      response: { data: { message: 'more than 50 milestones' } },
      message: 'more than 50 milestones',
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Cannot define more than 50 milestones');
  });

  it('returns 400 for flag TrustlessWork errors', async () => {
    trustlessWork.post.mockRejectedValueOnce({
      response: { data: { message: 'flags must be false' } },
      message: 'flags must be false',
    });

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('All flags (approved, disputed, released) must be false');
  });

  it('returns 500 for unexpected TrustlessWork errors', async () => {
    trustlessWork.post.mockRejectedValueOnce(new Error('Network timeout'));

    const res = mockRes();
    await deployEscrowHandler(
      mockReq({ apartmentId: 'APT001', tenantAddress: 'GTENANT', ownerAddress: 'GOWNER', amount: 1200, engagementId: 'ENG001' }),
      res,
    );

    expect(res._status).toBe(500);
    expect(res._body.error).toBe('Failed to deploy escrow');
  });
});
