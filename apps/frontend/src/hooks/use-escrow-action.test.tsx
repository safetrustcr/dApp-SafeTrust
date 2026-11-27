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
import { WalletRejectedError } from '@/lib/wallet/errors';

type FetchBody = { status: number; body: unknown };

const fetchMock = vi.fn();

function urlOf(callIndex: number): string {
  return String(fetchMock.mock.calls[callIndex][0]);
}

function buildCalls(): number {
  return fetchMock.mock.calls.filter(([url]) => !String(url).includes('/send-transaction')).length;
}

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

  it('uses the API passphrase even when the browser configuration differs', async () => {
    vi.stubEnv('STELLAR_NETWORK_PASSPHRASE', 'Public Global Stellar Network ; September 2015');
    fetchMock.mockResolvedValueOnce(jsonResponse({ unsignedXdr: 'XDR-1', networkPassphrase: 'server network' }));
    const { result } = renderHook(() => useEscrowAction());
    await act(async () => { await result.current.execute(CONFIG); });
    expect(signXDR).toHaveBeenCalledWith('XDR-1', 'server network');
    vi.unstubAllEnvs();
  });

  it('rotates the Idempotency-Key when apiBody changes on retry (e.g. edited newEvidence)', async () => {
    const { result } = renderHook(() => useEscrowAction());

    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('network down')));

    const firstConfig = {
      apiRoute: '/api/escrow/milestone-status',
      apiBody: { contractId: 'CA1', engagementId: 'eng-1', milestoneIndex: 0, newStatus: 'completed', newEvidence: 'First note' },
      sendTransactionBody: { action: 'mark_milestone_completed', contractId: 'CA1', engagementId: 'eng-1' },
    };

    await act(async () => {
      expect(await result.current.execute(firstConfig)).toBeNull();
    });

    const editedConfig = {
      ...firstConfig,
      apiBody: { ...firstConfig.apiBody, newEvidence: 'Edited note' },
    };

    await act(async () => {
      await result.current.execute(editedConfig);
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstBuildKey = headerOf(0);
    const editedBuildKey = headerOf(1);
    expect(editedBuildKey).not.toBe(firstBuildKey);
  });

  it('reports done after a successful attempt', async () => {
    const { result } = renderHook(() => useEscrowAction());
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.execute(CONFIG);
    });

    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('retries a cancelled signature with the same keys and without calling the build route again', async () => {
    const { result } = renderHook(() => useEscrowAction());
    signXDR.mockRejectedValueOnce(new WalletRejectedError());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBeInstanceOf(WalletRejectedError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const buildKey = headerOf(0);

    let done: Record<string, unknown> | null = null;
    await act(async () => {
      done = await result.current.retry();
    });

    expect(done).toMatchObject({ txHash: 'hash-1' });
    expect(result.current.status).toBe('done');
    // One build (first attempt) + one submit (retry): the retry signed the
    // cached XDR instead of building a second transaction.
    expect(buildCalls()).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlOf(1)).toContain('/api/escrow/send-transaction');
    expect(headerOf(1)).not.toBe(buildKey);
    expect(signXDR).toHaveBeenCalledTimes(2);
    expect(signXDR).toHaveBeenLastCalledWith('XDR-1', undefined);
    errorSpy.mockRestore();
  });

  it('retries a failed submit with the same submit key and no second build', async () => {
    const { result } = renderHook(() => useEscrowAction());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock
      .mockImplementationOnce(async () => jsonResponse({ unsignedXdr: 'XDR-1' }))
      .mockImplementationOnce(() => Promise.reject(new TypeError('network down')));

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });
    expect(result.current.status).toBe('failed');

    await act(async () => {
      expect(await result.current.retry()).toMatchObject({ txHash: 'hash-1' });
    });

    // calls: 0 build, 1 submit (failed), 2 submit (retry)
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(buildCalls()).toBe(1);
    expect(headerOf(2)).toBe(headerOf(1));
    errorSpy.mockRestore();
  });

  it('starts a new attempt when the inputs change', async () => {
    const { result } = renderHook(() => useEscrowAction());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    signXDR.mockRejectedValueOnce(new WalletRejectedError());

    await act(async () => {
      await result.current.execute(CONFIG);
    });
    await act(async () => {
      await result.current.execute({ ...CONFIG, apiBody: { ...CONFIG.apiBody, amount: 200 } });
    });

    expect(buildCalls()).toBe(2);
    expect(headerOf(1)).not.toBe(headerOf(0));
    errorSpy.mockRestore();
  });

  it('rebuilds with fresh keys after a 410 TRANSACTION_EXPIRED', async () => {
    const { result } = renderHook(() => useEscrowAction());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock
      .mockImplementationOnce(async () => jsonResponse({ unsignedXdr: 'XDR-OLD' }))
      .mockImplementationOnce(async () =>
        jsonResponse(
          { type: 'https://api.safetrust.dev/problems/transaction-expired', status: 410, detail: 'Transaction expired. Build it again.' },
          410,
        ),
      );

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });
    expect(result.current.status).toBe('failed');
    expect((result.current.error as { status?: number }).status).toBe(410);

    await act(async () => {
      expect(await result.current.retry()).toMatchObject({ txHash: 'hash-1' });
    });

    // calls: 0 build, 1 submit (410), 2 build (new XDR), 3 submit
    expect(buildCalls()).toBe(2);
    expect(headerOf(2)).not.toBe(headerOf(0));
    expect(headerOf(3)).not.toBe(headerOf(1));
    expect(signXDR).toHaveBeenLastCalledWith('XDR-1', undefined);
    errorSpy.mockRestore();
  });

  it('does not report done while the recovered transaction is still pending', async () => {
    const { result } = renderHook(() => useEscrowAction());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const txHash = 'a'.repeat(64);
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/recover-from-txhash')) return jsonResponse({ pending: true });
      if (String(url).includes('/send-transaction')) {
        return jsonResponse({ error: 'Confirmation timed out', txHash }, 504);
      }
      return jsonResponse({ unsignedXdr: 'XDR-1' });
    });

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toBeNull();
    });

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/recover-from-txhash'))).toBe(true);
    expect(result.current.status).toBe('failed');
    expect(result.current.actionError).not.toBeNull();
    errorSpy.mockRestore();
  });

  it('reports done once recovery confirms the transaction', async () => {
    const { result } = renderHook(() => useEscrowAction());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const txHash = 'b'.repeat(64);
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/recover-from-txhash')) return jsonResponse({ status: 'confirmed', txHash });
      if (String(url).includes('/send-transaction')) {
        return jsonResponse({ error: 'Confirmation timed out', txHash }, 504);
      }
      return jsonResponse({ unsignedXdr: 'XDR-1' });
    });

    await act(async () => {
      expect(await result.current.execute(CONFIG)).toMatchObject({ status: 'confirmed' });
    });

    expect(result.current.status).toBe('done');
    errorSpy.mockRestore();
  });
});
