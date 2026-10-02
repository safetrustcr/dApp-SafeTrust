import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

import { GET } from './route';

const mockFetch = vi.mocked(fetch);

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function okResponse() {
  return { ok: true, status: 200 } as unknown as Response;
}

function notFoundResponse() {
  return { ok: false, status: 404 } as unknown as Response;
}

describe('GET /api/health/hasura', () => {
  it('returns 404 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const res = await GET();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not available' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 200 with healthy:true when Hasura is healthy', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ healthy: true });
  });

  it('returns 503 with healthy:false when Hasura is unhealthy', async () => {
    mockFetch.mockResolvedValueOnce(notFoundResponse());

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ healthy: false });
  });

  it('returns 503 with healthy:false on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ healthy: false });
  });

  it('returns 503 with healthy:false on timeout', async () => {
    mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'));

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ healthy: false });
  });

  it('converts HASURA_GRAPHQL_URL from /v1/graphql to /healthz', async () => {
    vi.stubEnv('HASURA_GRAPHQL_URL', 'https://example.com/v1/graphql');
    mockFetch.mockResolvedValueOnce(okResponse());

    await GET();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/healthz',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('falls back to localhost:8080/healthz when HASURA_GRAPHQL_URL is not set', async () => {
    delete (process.env as Record<string, string | undefined>).HASURA_GRAPHQL_URL;
    mockFetch.mockResolvedValueOnce(okResponse());

    await GET();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/healthz',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('bounds the health request to a 1500ms timeout', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await GET();

    expect(timeoutSpy).toHaveBeenCalledWith(1500);

    const arg = mockFetch.mock.calls[0][1] as RequestInit & {
      signal: AbortSignal;
    };
    expect(arg.signal).toBeInstanceOf(AbortSignal);
    timeoutSpy.mockRestore();
  });
});
