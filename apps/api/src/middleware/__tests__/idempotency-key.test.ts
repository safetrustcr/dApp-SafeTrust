import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireIdempotencyKey } from '../idempotency-key.js';

vi.mock('../../services/hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));

import { hasuraRequest } from '../../services/hasura.js';

const mockedRequest = vi.mocked(hasuraRequest);

/** Queue one Hasura response, bypassing the generic return-type gymnastics. */
function when(value: unknown): void {
  mockedRequest.mockResolvedValueOnce(value as never);
}

function claim(affectedRows: number): void {
  when({ insert_api_idempotency_keys: { affected_rows: affectedRows } });
}

function storedRow(overrides: Record<string, unknown> = {}): void {
  when({
    api_idempotency_keys: [
      {
        user_id: 'uid-1',
        key: 'k-1',
        route: '/api/escrow/fund',
        status: 'in_progress',
        response_code: null,
        response_body: null,
        ...overrides,
      },
    ],
  });
}

function mockReq(headers: Record<string, string> = {}, user: unknown = { uid: 'uid-1' }) {
  return { headers, baseUrl: '/api/escrow', path: '/fund', user } as never;
}

function mockRes() {
  const res = {
    _status: 200 as number,
    _body: undefined as unknown,
    statusCode: 200,
    status(code: number) {
      this._status = code;
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this._body = payload;
      return this;
    },
  };
  return res;
}

describe('requireIdempotencyKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('400s with "Idempotency-Key required" when the header is missing', async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireIdempotencyKey(mockReq(), res as never, next as never);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'Idempotency-Key required' });
    expect(next).not.toHaveBeenCalled();
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('claims a new key, runs the handler and stores the response as completed', async () => {
    claim(1);
    when({ update_api_idempotency_keys: { affected_rows: 1 } });

    const res = mockRes();
    const handler = vi.fn((response: ReturnType<typeof mockRes>) => {
      response.status(200).json({ ok: true });
    });
    const next = vi.fn(() => handler(res));

    await requireIdempotencyKey(
      mockReq({ 'idempotency-key': 'k-1' }),
      res as never,
      next as never,
    );

    await vi.waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(2));

    // Claim uses INSERT ... ON CONFLICT DO NOTHING keyed on the primary key.
    const [claimQuery, claimVars] = mockedRequest.mock.calls[0];
    expect(claimQuery).toContain('insert_api_idempotency_keys');
    expect(claimQuery).toContain('constraint: api_idempotency_keys_pkey');
    expect(claimVars).toMatchObject({
      object: { user_id: 'uid-1', key: 'k-1', route: '/api/escrow/fund', status: 'in_progress' },
    });

    expect(handler).toHaveBeenCalledOnce();
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ ok: true });

    const [completeQuery, completeVars] = mockedRequest.mock.calls[1];
    expect(completeQuery).toContain('CompleteIdempotencyKey');
    expect(completeVars).toMatchObject({
      userId: 'uid-1',
      key: 'k-1',
      responseCode: 200,
      responseBody: { ok: true },
    });
  });

  it('replays the stored status + body without re-running the handler', async () => {
    claim(0);
    storedRow({ status: 'completed', response_code: 201, response_body: { ok: true, cached: true } });

    const res = mockRes();
    const handler = vi.fn();
    const next = vi.fn(() => handler());

    await requireIdempotencyKey(
      mockReq({ 'idempotency-key': 'k-1' }),
      res as never,
      next as never,
    );

    // The handler (which would call Trustless Work) never runs again.
    expect(handler).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(201);
    expect(res._body).toEqual({ ok: true, cached: true });
  });

  it('409s with "Request already in progress" for an in-progress duplicate', async () => {
    claim(0);
    storedRow({ status: 'in_progress' });

    const res = mockRes();
    const next = vi.fn();

    await requireIdempotencyKey(
      mockReq({ 'idempotency-key': 'k-1' }),
      res as never,
      next as never,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(409);
    expect(res._body).toEqual({ error: 'Request already in progress' });
  });

  it('422s with "Idempotency-Key reused" when the key was first used on another route', async () => {
    claim(0);
    storedRow({
      route: '/api/escrow/deploy',
      status: 'completed',
      response_code: 200,
      response_body: { ok: true },
    });

    const res = mockRes();
    const next = vi.fn();

    await requireIdempotencyKey(
      mockReq({ 'idempotency-key': 'k-1' }),
      res as never,
      next as never,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(422);
    expect(res._body).toEqual({ error: 'Idempotency-Key reused' });
  });

  it('401s when no authenticated user is attached', async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireIdempotencyKey(
      mockReq({ 'idempotency-key': 'k-1' }, undefined),
      res as never,
      next as never,
    );

    expect(res._status).toBe(401);
    expect(mockedRequest).not.toHaveBeenCalled();
  });
});
