import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => 'token-abc'),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken } },
}));

import { auth } from '@/lib/firebase';
import { postEscrowApi, EscrowApiError } from './escrow';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('postEscrowApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(jsonResponse({ unsignedXdr: 'XDR-1' }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends an auto-generated Idempotency-Key with the Firebase token', async () => {
    await postEscrowApi('/api/escrow/fund', { contractId: 'CA1' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toContain('/api/escrow/fund');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBe('Bearer token-abc');
    expect(init.headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('reuses a caller-provided Idempotency-Key', async () => {
    await postEscrowApi('/api/escrow/fund', { contractId: 'CA1' }, { idempotencyKey: 'attempt-key-1' });

    const [, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['Idempotency-Key']).toBe('attempt-key-1');
  });

  it('throws EscrowApiError carrying the API status and payload on failure', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Escrow changed. Refresh and retry' }, 409),
    );

    const error = await postEscrowApi('/api/escrow/fund', { contractId: 'CA1' }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(EscrowApiError);
    expect((error as EscrowApiError).status).toBe(409);
    expect((error as EscrowApiError).message).toBe('Escrow changed. Refresh and retry');
    expect((error as EscrowApiError).payload).toEqual({
      error: 'Escrow changed. Refresh and retry',
    });
  });

  it('rejects with 401 before fetching when the user is signed out', async () => {
    const original = (auth as unknown as { currentUser: unknown }).currentUser;
    (auth as unknown as { currentUser: unknown }).currentUser = null;

    try {
      const error = await postEscrowApi('/api/escrow/fund', { contractId: 'CA1' }).catch(
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(EscrowApiError);
      expect((error as EscrowApiError).status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      (auth as unknown as { currentUser: unknown }).currentUser = original;
    }
  });
});
