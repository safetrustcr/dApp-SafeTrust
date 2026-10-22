import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFirebaseSession, getFirebaseIdToken } from '../src/lib/firebase-session.js';

describe('Firebase local test-user session', () => {
  beforeEach(() => {
    clearFirebaseSession();
    vi.stubEnv('SAFETRUST_MCP_FIREBASE_API_KEY', 'local-api-key');
    vi.stubEnv('SAFETRUST_MCP_TEST_EMAIL', 'mcp-guest@test.safetrust.dev');
    vi.stubEnv('SAFETRUST_MCP_TEST_PASSWORD', 'local-only-password');
  });

  afterEach(() => {
    clearFirebaseSession();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('signs in once and reuses the cached ID token', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          idToken: 'initial-id-token',
          refreshToken: 'initial-refresh-token',
          expiresIn: '3600',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFirebaseIdToken()).resolves.toBe('initial-id-token');
    await expect(getFirebaseIdToken()).resolves.toBe('initial-id-token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('accounts:signInWithPassword');
    expect(fetchMock.mock.calls[0][1]?.body).toContain('local-only-password');
  });

  it('refreshes the token five minutes before its expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T08:00:00.000Z'));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            idToken: 'initial-id-token',
            refreshToken: 'initial-refresh-token',
            expiresIn: '3600',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id_token: 'refreshed-id-token',
            refresh_token: 'refreshed-refresh-token',
            expires_in: '3600',
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFirebaseIdToken()).resolves.toBe('initial-id-token');
    vi.advanceTimersByTime(55 * 60 * 1000);
    await expect(getFirebaseIdToken()).resolves.toBe('refreshed-id-token');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('securetoken.googleapis.com');
    expect(fetchMock.mock.calls[1][1]?.body).toContain('initial-refresh-token');
  });
});
