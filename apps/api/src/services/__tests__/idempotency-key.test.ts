import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../hasura.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hasura.js')>();
  return { ...actual, hasuraRequest: vi.fn() };
});

import { hasuraRequest, HasuraRequestError } from '../hasura.js';
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
  STALE_IN_PROGRESS_MS,
  type IdempotencyRow,
} from '../idempotency-key.js';

const requestMock = hasuraRequest as unknown as Mock;

function row(overrides: Partial<IdempotencyRow> = {}): IdempotencyRow {
  return {
    user_id: 'user-1',
    key: 'key-1',
    route: '/api/escrow/fund',
    status: 'completed',
    response_code: 200,
    response_body: { ok: true },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function dispatch(handlers: {
  get?: () => IdempotencyRow[];
  reserve?: () => void;
  deleteStale?: () => number;
}): void {
  requestMock.mockImplementation(async (query: string) => {
    if (query.includes('GetIdempotencyKey')) {
      return { api_idempotency_keys: handlers.get ? handlers.get() : [] };
    }
    if (query.includes('ReserveIdempotencyKey')) {
      if (handlers.reserve) handlers.reserve();
      return { insert_api_idempotency_keys_one: { key: 'key-1' } };
    }
    if (query.includes('DeleteStaleIdempotencyKey')) {
      return { delete_api_idempotency_keys: { affected_rows: handlers.deleteStale ? handlers.deleteStale() : 1 } };
    }
    throw new Error(`unexpected query: ${query.slice(0, 80)}`);
  });
}

function uniqueViolation(): never {
  throw new HasuraRequestError('duplicate key value violates unique constraint', [
    {
      message: 'duplicate key value violates unique constraint "api_idempotency_keys_pkey"',
      extensions: { code: 'unique_violation' },
    },
  ]);
}

describe('claimIdempotencyKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('claims a key that does not exist yet', async () => {
    dispatch({ get: () => [] });

    await expect(claimIdempotencyKey('user-1', 'key-1', '/api/escrow/fund')).resolves.toEqual({
      outcome: 'claimed',
    });
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('replays a completed key with the same route', async () => {
    const existing = row();
    dispatch({ get: () => [existing] });

    const result = await claimIdempotencyKey('user-1', 'key-1', '/api/escrow/fund');
    expect(result).toEqual({ outcome: 'replay', row: existing });
  });

  it('reports in_progress while another request holds a fresh reservation', async () => {
    const existing = row({ status: 'in_progress', response_code: null, response_body: null });
    dispatch({ get: () => [existing] });

    const result = await claimIdempotencyKey('user-1', 'key-1', '/api/escrow/fund');
    expect(result).toEqual({ outcome: 'in_progress', row: existing });
  });

  it('reports route_mismatch when the key was reserved for another route', async () => {
    const existing = row({ route: '/api/escrow/deploy' });
    dispatch({ get: () => [existing] });

    const result = await claimIdempotencyKey('user-1', 'key-1', '/api/escrow/fund');
    expect(result.outcome).toBe('route_mismatch');
  });

  it('takes over a stale in_progress reservation', async () => {
    const stale = row({
      status: 'in_progress',
      response_code: null,
      response_body: null,
      created_at: new Date(Date.now() - STALE_IN_PROGRESS_MS - 5_000).toISOString(),
    });
    let reserved = false;
    dispatch({
      get: () => [stale],
      reserve: () => {
        reserved = true;
      },
      deleteStale: () => 1,
    });

    await expect(claimIdempotencyKey('user-1', 'key-1', '/api/escrow/fund')).resolves.toEqual({
      outcome: 'claimed',
    });
    expect(reserved).toBe(true);
  });

  it('keeps in_progress when the stale reservation cannot be deleted', async () => {
    const stale = row({
      status: 'in_progress',
      response_code: null,
      response_body: null,
      created_at: new Date(Date.now() - STALE_IN_PROGRESS_MS - 5_000).toISOString(),
    });
    dispatch({ get: () => [stale], deleteStale: () => 0 });

    const result = await claimIdempotencyKey('user-1', 'key-1', '/api/escrow/fund');
    expect(result.outcome).toBe('in_progress');
  });

  it('resolves a lost insert race against the winning row', async () => {
    const winner = row();
    let getCalls = 0;
    dispatch({
      get: () => {
        getCalls += 1;
        return getCalls === 1 ? [] : [winner];
      },
      reserve: () => uniqueViolation(),
    });

    const result = await claimIdempotencyKey('user-1', 'key-1', '/api/escrow/fund');
    expect(result).toEqual({ outcome: 'replay', row: winner });
    expect(requestMock).toHaveBeenCalledTimes(3);
  });
});

describe('completeIdempotencyKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores the response code and body', async () => {
    requestMock.mockResolvedValue({ update_api_idempotency_keys: { affected_rows: 1 } });

    await completeIdempotencyKey('user-1', 'key-1', 201, { hello: 'world' });

    expect(requestMock).toHaveBeenCalledWith(
      expect.stringContaining('CompleteIdempotencyKey'),
      {
        user_id: 'user-1',
        key: 'key-1',
        response_code: 201,
        response_body: { hello: 'world' },
      },
    );
  });

  it('normalizes an undefined body to null for jsonb', async () => {
    requestMock.mockResolvedValue({ update_api_idempotency_keys: { affected_rows: 1 } });

    await completeIdempotencyKey('user-1', 'key-1', 204, undefined);

    const vars = requestMock.mock.calls[0][1] as Record<string, unknown>;
    expect(vars.response_body).toBeNull();
  });
});

describe('releaseIdempotencyKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes only the in_progress reservation', async () => {
    requestMock.mockResolvedValue({ delete_api_idempotency_keys: { affected_rows: 1 } });

    await releaseIdempotencyKey('user-1', 'key-1');

    expect(requestMock).toHaveBeenCalledWith(
      expect.stringContaining('ReleaseIdempotencyKey'),
      { user_id: 'user-1', key: 'key-1' },
    );
  });
});
