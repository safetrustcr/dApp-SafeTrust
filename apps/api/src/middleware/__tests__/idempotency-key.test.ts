import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../services/idempotency-key.js', () => ({
  claimIdempotencyKey: vi.fn(),
  completeIdempotencyKey: vi.fn(async () => {}),
  releaseIdempotencyKey: vi.fn(async () => {}),
}));

import { requireIdempotencyKey } from '../idempotency-key.js';
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
  type IdempotencyRow,
} from '../../services/idempotency-key.js';

type MockRes = {
  _status: number;
  _body: unknown;
  _headers: Record<string, string>;
  statusCode: number;
  status: (code: number) => MockRes;
  json: (body: unknown) => MockRes;
  setHeader: (name: string, value: string) => void;
  end: () => MockRes;
};

function makeReq(key?: string, opts: { uid?: string | undefined } = {}): Request {
  const uid = 'uid' in opts ? opts.uid : 'user-1';
  return {
    headers: key !== undefined ? { 'idempotency-key': key } : {},
    body: {},
    ...(uid !== undefined ? { user: { uid } } : {}),
    header: (name: string) =>
      key !== undefined && name.toLowerCase() === 'idempotency-key' ? key : undefined,
  } as unknown as Request;
}

function makeRes(): { res: Response; mock: MockRes } {
  const mock: MockRes = {
    _status: 200,
    _body: undefined,
    _headers: {},
    statusCode: 200,
    status(code: number) {
      this._status = code;
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this._headers[name.toLowerCase()] = value;
    },
    end() {
      return this;
    },
  };
  return { res: mock as unknown as Response, mock };
}

function completedRow(overrides: Partial<IdempotencyRow> = {}): IdempotencyRow {
  return {
    user_id: 'user-1',
    key: 'key-1',
    route: '/api/escrow/fund',
    status: 'completed',
    response_code: 200,
    response_body: { hello: 'world' },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('requireIdempotencyKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a request without the header with 400', async () => {
    const { res, mock } = makeRes();
    const next = vi.fn();

    requireIdempotencyKey('/api/escrow/fund')(makeReq(undefined), res, next);
    await vi.waitFor(() => expect(mock._status).toBe(400));

    expect(mock._body).toEqual({ error: 'Idempotency-Key required' });
    expect(claimIdempotencyKey).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const { res, mock } = makeRes();
    const next = vi.fn();

    requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1', { uid: undefined }), res, next);
    await vi.waitFor(() => expect(mock._status).toBe(401));

    expect(claimIdempotencyKey).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('runs the handler for a new key and persists its response', async () => {
    vi.mocked(claimIdempotencyKey).mockResolvedValue({ outcome: 'claimed' });
    const { res, mock } = makeRes();
    const next = vi.fn(() => {
      res.status(201).json({ created: true });
    });

    requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1'), res, next);

    await vi.waitFor(() =>
      expect(completeIdempotencyKey).toHaveBeenCalledWith('user-1', 'key-1', 201, { created: true }),
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(releaseIdempotencyKey).not.toHaveBeenCalled();
  });

  it('replays the stored response without running the handler again', async () => {
    vi.mocked(claimIdempotencyKey).mockResolvedValue({
      outcome: 'replay',
      row: completedRow(),
    });
    const { res, mock } = makeRes();
    const next = vi.fn();

    requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1'), res, next);
    await vi.waitFor(() => expect(mock._status).toBe(200));

    expect(mock._body).toEqual({ hello: 'world' });
    expect(mock._headers['idempotent-replay']).toBe('true');
    expect(next).not.toHaveBeenCalled();
    expect(completeIdempotencyKey).not.toHaveBeenCalled();
  });

  it('returns 409 while the same key is still in progress', async () => {
    vi.mocked(claimIdempotencyKey).mockResolvedValue({
      outcome: 'in_progress',
      row: completedRow({ status: 'in_progress', response_code: null, response_body: null }),
    });
    const { res, mock } = makeRes();
    const next = vi.fn();

    requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1'), res, next);
    await vi.waitFor(() => expect(mock._status).toBe(409));

    expect(mock._body).toEqual({ error: 'Request already in progress' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when the key was reserved for a different route', async () => {
    vi.mocked(claimIdempotencyKey).mockResolvedValue({
      outcome: 'route_mismatch',
      row: completedRow({ route: '/api/escrow/deploy' }),
    });
    const { res, mock } = makeRes();
    const next = vi.fn();

    requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1'), res, next);
    await vi.waitFor(() => expect(mock._status).toBe(422));

    expect(mock._body).toEqual({ error: 'Idempotency-Key reused for a different route' });
    expect(next).not.toHaveBeenCalled();
  });

  it('releases the key after a 5xx response so a retry can run again', async () => {
    vi.mocked(claimIdempotencyKey).mockResolvedValue({ outcome: 'claimed' });
    const { res, mock } = makeRes();
    const next = vi.fn(() => {
      res.status(500).json({ error: 'boom' });
    });

    requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1'), res, next);

    await vi.waitFor(() => expect(releaseIdempotencyKey).toHaveBeenCalledWith('user-1', 'key-1'));
    expect(completeIdempotencyKey).not.toHaveBeenCalled();
  });

  it('returns 500 when the claim itself fails', async () => {
    vi.mocked(claimIdempotencyKey).mockRejectedValue(new Error('hasura down'));
    const { res, mock } = makeRes();
    const next = vi.fn();

    requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1'), res, next);
    await vi.waitFor(() => expect(mock._status).toBe(500));

    expect(next).not.toHaveBeenCalled();
  });

  it('treats a second request with the same key as a replay exactly once', async () => {
    vi.mocked(claimIdempotencyKey)
      .mockResolvedValueOnce({ outcome: 'claimed' })
      .mockResolvedValueOnce({ outcome: 'replay', row: completedRow() });

    const runOnce = async () => {
      const { res, mock } = makeRes();
      const next = vi.fn(() => {
        res.status(200).json({ first: true });
      });
      requireIdempotencyKey('/api/escrow/fund')(makeReq('key-1'), res, next);
      await vi.waitFor(() => expect(mock._status).toBe(200));
      return { mock, next };
    };

    const first = await runOnce();
    await vi.waitFor(() => expect(completeIdempotencyKey).toHaveBeenCalledTimes(1));

    const second = await runOnce();
    expect(second.mock._headers['idempotent-replay']).toBe('true');
    expect(second.next).not.toHaveBeenCalled();
    expect(first.next).toHaveBeenCalledTimes(1);
    expect(completeIdempotencyKey).toHaveBeenCalledTimes(1);
  });
});
