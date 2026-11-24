import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv, setEnv } from '../helpers/env.js';
import { jsonResponse, stubFetch, type RecordedCall } from '../helpers/fetch.js';
import { textOf, type TestClient } from '../helpers/mcp.js';

const GUEST_UID = 'contract-guest-uid';
const VALID_TOKEN = 'valid-id-token';
const TENANT = `G${'A'.repeat(55)}`;

/**
 * Firebase is the only credential provider the routes need; verifying a real ID
 * token is impossible offline, so the admin SDK is replaced with a verifier that
 * accepts one known token and rejects everything else.
 */
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async (token: string) => {
      if (token !== 'valid-id-token') {
        throw Object.assign(new Error('invalid token'), { code: 'auth/invalid-id-token' });
      }
      return { uid: 'contract-guest-uid', email: 'guest@example.com' };
    },
  }),
}));

// The stub below replaces globalThis.fetch, which the test also needs to reach
// the in-process server, so hold on to the real implementation.
const realFetch = globalThis.fetch;

let server: Server;
let baseUrl: string;
let open: TestClient | undefined;
let hasuraCalls: RecordedCall[] = [];

function installHasura(options: { completedReplay?: { route: string; body: unknown } } = {}) {
  const { calls } = stubFetch(async (call) => {
    // Anything that is not Hasura (the MCP client calling the in-process API)
    // has to reach the real server on 127.0.0.1.
    if (!call.url.startsWith('http://hasura.test/v1/graphql')) {
      return realFetch(call.url, {
        method: call.method,
        headers: call.headers,
        body: call.body,
      });
    }

    const query = call.body ? (JSON.parse(call.body) as { query?: string }).query ?? '' : '';

    if (query.includes('GetIdempotencyKey')) {
      return jsonResponse({
        data: {
          api_idempotency_keys: options.completedReplay
            ? [
                {
                  user_id: GUEST_UID,
                  key: 'key-1',
                  route: options.completedReplay.route,
                  status: 'completed',
                  response_code: 200,
                  response_body: options.completedReplay.body,
                  created_at: new Date().toISOString(),
                },
              ]
            : [],
        },
      });
    }
    if (query.includes('ReserveIdempotencyKey')) {
      return jsonResponse({ data: { insert_api_idempotency_keys_one: { key: 'key-1' } } });
    }
    if (query.includes('CompleteIdempotencyKey')) {
      return jsonResponse({ data: { update_api_idempotency_keys: { affected_rows: 1 } } });
    }
    if (query.includes('ReleaseIdempotencyKey')) {
      return jsonResponse({ data: { delete_api_idempotency_keys: { affected_rows: 1 } } });
    }
    return jsonResponse({ data: {} });
  });

  hasuraCalls = calls;
}

async function request(
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<{ status: number; contentType: string | null; headers: Headers; body: unknown }> {
  const response = await realFetch(`${baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    headers: response.headers,
    body: text ? JSON.parse(text) : undefined,
  };
}

beforeAll(async () => {
  setEnv({
    HASURA_GRAPHQL_URL: 'http://hasura.test/v1/graphql',
    HASURA_ADMIN_SECRET: 'contract-admin-secret',
    PLATFORM_STELLAR_ADDRESS: `G${'P'.repeat(55)}`,
    USDC_TRUSTLINE_ADDRESS: `G${'U'.repeat(55)}`,
    HASURA_GRAPHQL_ADMIN_SECRET: undefined,
  });

  const { createApp } = await import('../../../apps/api/src/app.js');
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  installHasura();
});

afterEach(async () => {
  await open?.close();
  open = undefined;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  restoreEnv();
});

describe('GET /health', () => {
  it('keeps the shape check-stack-health reports on', async () => {
    const response = await request('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', firebase: 'configured' });
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('POST /api/escrow/deploy', () => {
  it('401s without a Firebase bearer token', async () => {
    const response = await request('/api/escrow/deploy', { method: 'POST', body: {} });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing or malformed Bearer token' });
  });

  it('401s with a token Firebase rejects', async () => {
    const response = await request('/api/escrow/deploy', {
      method: 'POST',
      headers: { Authorization: 'Bearer forged-token' },
      body: {},
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid or expired Firebase token' });
  });

  it('400s without an Idempotency-Key header once authenticated', async () => {
    const response = await request('/api/escrow/deploy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
      body: {},
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Idempotency-Key required' });
  });

  it('400s when neither apartmentId nor senderAddress is supplied', async () => {
    const response = await request('/api/escrow/deploy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${VALID_TOKEN}`, 'Idempotency-Key': 'key-1' },
      body: {},
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Provide exactly one apartmentId or reservationId, and senderAddress',
    });
  });

  it('replays a stored response for a completed Idempotency-Key', async () => {
    installHasura({
      completedReplay: {
        route: '/api/escrow/deploy',
        body: { status: 'SUCCESS', contractId: 'CABC', unsignedXDR: '', engagementId: 'eng-1' },
      },
    });

    const response = await request('/api/escrow/deploy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${VALID_TOKEN}`, 'Idempotency-Key': 'key-1' },
      body: { apartmentId: '11111111-1111-4111-8111-111111111111', senderAddress: TENANT },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('idempotent-replay')).toBe('true');
    expect(response.body).toEqual({
      status: 'SUCCESS',
      contractId: 'CABC',
      unsignedXDR: '',
      engagementId: 'eng-1',
    });
    expect(hasuraCalls.some((call) => (call.body ?? '').includes('apartments_by_pk'))).toBe(false);
  });
});

describe('POST /api/escrow/fund', () => {
  it('401s without a bearer token', async () => {
    const response = await request('/api/escrow/fund', { method: 'POST', body: {} });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing or malformed Bearer token' });
  });

  it('returns RFC 7807 problem details for a missing engagementId', async () => {
    const response = await request('/api/escrow/fund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${VALID_TOKEN}`, 'Idempotency-Key': 'key-1' },
      body: {},
    });

    expect(response.status).toBe(400);
    expect(response.contentType).toContain('application/problem+json');
    expect(response.body).toMatchObject({
      type: 'https://api.safetrust.dev/problems/invalid-engagement-id',
      title: 'API error',
      status: 400,
      detail: 'engagementId is required.',
    });
    expect(typeof (response.body as { requestId: unknown }).requestId).toBe('string');
  });
});

describe('MCP → apps/api contract', () => {
  it('relays the route 401 instead of pretending the action succeeded', async () => {
    open = await bootTestClient({ SAFETRUST_API_URL: baseUrl });

    const result = await open.client.callTool({
      name: 'fund-escrow',
      arguments: { contractId: 'CABC', signer: TENANT, amount: 10 },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(
      'Fund failed (HTTP 401): Missing or malformed Bearer token',
    );
  });
});
