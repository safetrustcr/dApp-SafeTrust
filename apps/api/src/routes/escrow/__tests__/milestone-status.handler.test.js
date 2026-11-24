import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../build-escrow-action.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildEscrowAction: vi.fn() };
});

vi.mock('../../../services/hotel-reservation-escrow.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getHotelReservation: vi.fn() };
});

import { ApiError } from '../../../http/api-error.js';
import { buildEscrowAction } from '../build-escrow-action.js';
import { getHotelReservation } from '../../../services/hotel-reservation-escrow.js';
import { milestoneStatusHandler, STAY_NOT_FINISHED } from '../milestone-status.handler.js';
import { mockNext, mockReq, mockRes } from './helpers.js';

const mockBuildEscrowAction = vi.mocked(buildEscrowAction);
const mockGetHotelReservation = vi.mocked(getHotelReservation);
const authedReq = (body) => ({ ...mockReq(body), user: { uid: 'host-uid' } });

describe('milestoneStatusHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects hotel milestone before check-out with 409 STAY_NOT_FINISHED', async () => {
    const futureCheckOut = new Date(Date.now() + 86400000).toISOString();
    mockGetHotelReservation.mockResolvedValueOnce({ check_out: futureCheckOut });

    const next = mockNext();
    await milestoneStatusHandler(
      authedReq({ engagementId: 'hotel:res-123', milestoneIndex: 0 }),
      mockRes(),
      next,
    );

    expect(next.error).toMatchObject({
      status: 409,
      code: STAY_NOT_FINISHED,
    });
    expect(mockGetHotelReservation).toHaveBeenCalledWith('res-123');
    expect(mockBuildEscrowAction).not.toHaveBeenCalled();
  });

  it('allows hotel milestone after check-out', async () => {
    const pastCheckOut = new Date(Date.now() - 86400000).toISOString();
    mockGetHotelReservation.mockResolvedValueOnce({ check_out: pastCheckOut });
    const result = { unsignedXdr: 'HOTEL_XDR_001', txHash: 'hotel-hash-1' };
    mockBuildEscrowAction.mockResolvedValueOnce(result);

    const res = mockRes();
    const next = mockNext();
    await milestoneStatusHandler(
      authedReq({ engagementId: 'hotel:res-123', milestoneIndex: 0 }),
      res,
      next,
    );

    expect(next.error).toBeUndefined();
    expect(res._status).toBe(200);
    expect(res._body).toEqual(result);
    expect(mockGetHotelReservation).toHaveBeenCalledWith('res-123');
    expect(mockBuildEscrowAction).toHaveBeenCalledWith(
      expect.objectContaining({ engagementId: 'hotel:res-123' }),
    );
  });

  it('newEvidence over 500 chars returns 400', async () => {
    const next = mockNext();
    await milestoneStatusHandler(
      authedReq({ engagementId: 'eng-1', milestoneIndex: 0, newEvidence: 'a'.repeat(501) }),
      mockRes(),
      next,
    );

    expect(next.error).toMatchObject({
      status: 400,
      code: 'INVALID_EVIDENCE',
    });
    expect(mockBuildEscrowAction).not.toHaveBeenCalled();
  });

  it('apartment escrow skips check-out gate', async () => {
    const result = { unsignedXdr: 'APT_XDR_001', txHash: 'apt-hash-1' };
    mockBuildEscrowAction.mockResolvedValueOnce(result);

    const res = mockRes();
    const next = mockNext();
    await milestoneStatusHandler(
      authedReq({ engagementId: 'apartment-engagement-1', milestoneIndex: 0 }),
      res,
      next,
    );

    expect(next.error).toBeUndefined();
    expect(res._status).toBe(200);
    expect(mockGetHotelReservation).not.toHaveBeenCalled();
    expect(mockBuildEscrowAction).toHaveBeenCalledWith(
      expect.objectContaining({ engagementId: 'apartment-engagement-1' }),
    );
  });

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
