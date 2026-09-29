/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { signXDR } = vi.hoisted(() => ({
  signXDR: vi.fn(async () => 'SIGNED_XDR'),
}));

vi.mock('@/components/auth/wallet/hooks/wallet.hook', () => ({
  useWallet: () => ({ signXDR }),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'token-abc' } },
}));

import { useEscrowAction } from './use-escrow-action';

type FetchBody = { status: number; body: unknown };

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function headerOf(callIndex: number): string {
  const init = fetchMock.mock.calls[callIndex][1] as { headers: Record<string, string> };
  return init.headers['Idempotency-Key'];
}

const CONFIG = {
  apiRoute: '/api/escrow/fund',
  apiBody: { contractId: 'CA1', amount: 100 },
  sendTransactionBody: {
    action: 'fund',
    contractId: 'CA1',
    engagementId: 'eng-1',
    amount: 100,
  },
};

describe('useEscrowAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof globalThis.crypto?.randomUUID !== 'function') {
      (globalThis.crypto as unknown as { randomUUID: () => string }).randomUUID = () =>
        '00000000-0000-4000-8000-000000000000';
    }
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/send-transaction')) {
        return jsonResponse({ txHash: 'hash-1', status: 'SUCCESS' });
      }
      return jsonResponse({ unsignedXdr: 'XDR-1' });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ignores a double click — one build request and one signing', async () => {
    const { result } = renderHook(() => useEscrowAction());

    let resolveBuild!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBuild = resolve;
        }),
    );

    let first!: Promise<Record<string, unknown> | null>;
    await act(async () => {
      first = result.current.execute(CONFIG);
      const second = await result.current.execute(CONFIG);
      expect(second).toBeNull();
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveBuild(jsonResponse({ unsignedXdr: 'XDR-1' }));
      expect(await first).toMatchObject({ txHash: 'hash-1' });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signXDR).toHaveBeenCalledTimes(1);
    expect(result.current.actioning).toBe(false);
    expect(result.current.phase).toBe(null);
  });

  it('reuses the attempt keys when a failed attempt is retried', async () => {
    const { result } = renderHook(() => useEscrowAction());

    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('network down')));

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });
    expect(result.current.actionError).toEqual(['network down']);

    let done: Record<string, unknown> | null = null;
    await act(async () => {
      done = await result.current.execute(CONFIG);
    });

    expect(done).toMatchObject({ txHash: 'hash-1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const firstBuildKey = headerOf(0);
    const retryBuildKey = headerOf(1);
    const submitKey = headerOf(2);
    expect(firstBuildKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(retryBuildKey).toBe(firstBuildKey);
    expect(submitKey).not.toBe(firstBuildKey);
  });

  it('sets conflict on a 409 and starts the next attempt with a fresh key', async () => {
    const { result } = renderHook(() => useEscrowAction());

    const respond409 = async (url: string) => {
      if (String(url).includes('/send-transaction')) {
        return jsonResponse({ error: 'Escrow changed. Refresh and retry' }, 409);
      }
      return jsonResponse({ unsignedXdr: 'XDR-1' });
    };
    fetchMock.mockImplementation(respond409);

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });

    expect(result.current.conflict).toBe(true);
    expect(result.current.actionError).toEqual(
      expect.arrayContaining([
        expect.stringContaining('The escrow state changed — showing the latest status.'),
      ]),
    );
    expect(result.current.actioning).toBe(false);

    const firstBuildKey = headerOf(0);
    expect(headerOf(1)).not.toBe(firstBuildKey);

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });

    // calls: 0 build#1, 1 submit#1, 2 build#2
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(headerOf(2)).not.toBe(firstBuildKey);
    expect(result.current.conflict).toBe(true);
  });

  it('does not call the wallet signer when the build fails', async () => {
    const { result } = renderHook(() => useEscrowAction());

    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('boom')));

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });

    expect(signXDR).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe(null);
  });
});
