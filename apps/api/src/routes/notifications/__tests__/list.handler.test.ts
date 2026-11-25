import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { ApiError } from '../../../http/api-error.js';

vi.mock('../../../services/escrow-authz.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/escrow-authz.js')>()),
  getUserWallets: vi.fn(),
}));
vi.mock('../../../services/hotel-reservation-escrow.js', () => ({ getHotelUserWallets: vi.fn() }));
vi.mock('../../../services/notifications-db.js', () => ({
  fetchLifecycleMessages: vi.fn(),
  fetchActionableEscrows: vi.fn(),
  fetchMilestoneCompletedEscrowIds: vi.fn(),
}));

import { getUserWallets } from '../../../services/escrow-authz.js';
import { getHotelUserWallets } from '../../../services/hotel-reservation-escrow.js';
import { fetchActionableEscrows, fetchLifecycleMessages, fetchMilestoneCompletedEscrowIds } from '../../../services/notifications-db.js';
import { listNotificationsHandler } from '../list.handler.js';

const wallets = vi.mocked(getUserWallets);
const hotelWallets = vi.mocked(getHotelUserWallets);
const messages = vi.mocked(fetchLifecycleMessages);
const escrows = vi.mocked(fetchActionableEscrows);
const completed = vi.mocked(fetchMilestoneCompletedEscrowIds);

type MockRes = Response & { _status: number; _body: any; _headers: Record<string, string> };

function mockRes(): MockRes {
  const res: any = {
    _status: 0,
    _body: undefined,
    _headers: {},
    status(code: number) { res._status = code; return res; },
    json(payload: unknown) { res._body = payload; return res; },
    set(name: string, value: string) { res._headers[name] = value; return res; },
  };
  return res as MockRes;
}

const req = (query: Record<string, unknown> = {}, uid = 'guest-uid') =>
  ({ user: { uid, email: 'g@example.com', role: 'guest' }, query }) as unknown as AuthenticatedRequest;

async function call(request: AuthenticatedRequest) {
  const res = mockRes();
  const next = vi.fn() as unknown as NextFunction;
  await listNotificationsHandler(request, res, next);
  return { res, next: next as unknown as ReturnType<typeof vi.fn> };
}

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PLATFORM_STELLAR_ADDRESS;
    wallets.mockResolvedValue([]);
    hotelWallets.mockResolvedValue([]);
    messages.mockResolvedValue([]);
    escrows.mockResolvedValue([]);
    completed.mockResolvedValue(new Set());
  });

  it('returns an empty list for a user with no escrows (no invented alerts)', async () => {
    const { res } = await call(req());
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ notifications: [] });
    expect(res._headers['Cache-Control']).toBe('no-store');
  });

  it('scopes every query to the verified caller, never to request input', async () => {
    wallets.mockResolvedValue(['GGUEST']);
    await call(req({ uid: 'someone-else', userId: 'x' }, 'guest-uid'));
    expect(wallets).toHaveBeenCalledWith('guest-uid');
    expect(messages).toHaveBeenCalledWith('guest-uid', 50);
    expect(escrows).toHaveBeenCalledWith(['GGUEST'], false);
  });

  it('builds pending actions from escrow status and the caller\'s role', async () => {
    wallets.mockResolvedValue(['GGUEST']);
    escrows.mockResolvedValue([
      { id: 'e1', engagement_id: 'eng', contract_id: 'C1', sender_address: 'GGUEST', receiver_address: 'GHOST', amount: '10', status: 'created', created_at: '2026-11-01T00:00:00.000Z', updated_at: '2026-11-02T00:00:00.000Z', apartment_id: 'a1', apartment: { name: 'Casa' } },
    ]);
    const { res } = await call(req());
    expect(res._body.notifications).toHaveLength(1);
    expect(res._body.notifications[0]).toMatchObject({ kind: 'pending_action', action: 'fund', escrowId: 'e1' });
  });

  it('asks about milestone completion only for funded escrows', async () => {
    wallets.mockResolvedValue(['GGUEST']);
    escrows.mockResolvedValue([
      { id: 'e1', engagement_id: 'eng', contract_id: 'C1', sender_address: 'GGUEST', receiver_address: 'GHOST', amount: '10', status: 'funded', created_at: '2026-11-01T00:00:00.000Z', updated_at: '2026-11-02T00:00:00.000Z' },
      { id: 'e2', engagement_id: 'eng2', contract_id: 'C2', sender_address: 'GGUEST', receiver_address: 'GHOST', amount: '10', status: 'created', created_at: '2026-11-01T00:00:00.000Z', updated_at: '2026-11-02T00:00:00.000Z' },
    ]);
    completed.mockResolvedValue(new Set(['e1']));
    const { res } = await call(req());
    expect(completed).toHaveBeenCalledWith(['e1']);
    expect(res._body.notifications.map((n: any) => n.action).sort()).toEqual(['approve_milestone', 'fund']);
  });

  it('lets a platform wallet see disputes to resolve', async () => {
    process.env.PLATFORM_STELLAR_ADDRESS = 'GPLATFORM';
    wallets.mockResolvedValue(['GPLATFORM']);
    await call(req());
    expect(escrows).toHaveBeenCalledWith(['GPLATFORM'], true);
  });

  it('tolerates a tenant without the hotel wallet table', async () => {
    wallets.mockResolvedValue(['GGUEST']);
    hotelWallets.mockRejectedValue(new Error('field "users_wallets" not found'));
    const { res, next } = await call(req());
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(200);
    expect(escrows).toHaveBeenCalledWith(['GGUEST'], false);
  });

  it('merges hotel wallets into the caller\'s wallet set', async () => {
    wallets.mockResolvedValue(['GGUEST']);
    hotelWallets.mockResolvedValue(['GHOTEL', 'GGUEST']);
    await call(req());
    expect(escrows).toHaveBeenCalledWith(['GGUEST', 'GHOTEL'], false);
  });

  it('validates limit', async () => {
    for (const limit of ['0', '101', 'abc', '1.5', '-1', '']) {
      const { next } = await call(req({ limit }));
      const error = next.mock.calls[0]?.[0];
      expect(error, limit).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
      expect((error as ApiError).code).toBe('INVALID_LIMIT');
    }
    await call(req({ limit: '25' }));
    expect(messages).toHaveBeenLastCalledWith('guest-uid', 25);
  });

  it('forwards upstream failures to the error boundary instead of returning partial data', async () => {
    messages.mockRejectedValue(new Error('hasura down'));
    const { res, next } = await call(req());
    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(0);
  });
});
