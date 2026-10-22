import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFirebaseSession } from '../src/lib/firebase-session.js';
import { apiRequest } from '../src/lib/api.js';

describe('protected apps/api requests', () => {
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
  });

  it('sends both headers required by the deploy and fund route middleware', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            idToken: 'local-test-id-token',
            refreshToken: 'local-refresh-token',
            expiresIn: '3600',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ pendingActionId: 'pending-deploy' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ pendingActionId: 'pending-fund' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const requests = [
      {
        path: '/api/escrow/deploy',
        body: { apartmentId: '2fa85f64-5717-4562-b3fc-2c963f66afa6', senderAddress: 'G-test' },
        key: '2fa85f64-5717-4562-b3fc-2c963f66afa6',
      },
      {
        path: '/api/escrow/fund',
        body: { engagementId: 'rental:test-engagement' },
        key: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      },
    ];

    for (const request of requests) {
      const result = await apiRequest(request.path, {
        method: 'POST',
        body: request.body,
        auth: 'required',
        idempotencyKey: request.key,
      });
      expect(result.ok).toBe(true);
      expect(JSON.stringify(result)).not.toContain('local-test-id-token');
    }

    for (const [, request] of fetchMock.mock.calls.slice(1)) {
      expect(request?.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer local-test-id-token',
        'Idempotency-Key': expect.any(String),
      });
    }
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      'Idempotency-Key': requests[0].key,
    });
    expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({
      'Idempotency-Key': requests[1].key,
    });
  });
});
