import { afterEach, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv } from '../helpers/env.js';
import { jsonResponse, stubFetch, textResponse } from '../helpers/fetch.js';
import { textOf, type TestClient } from '../helpers/mcp.js';

let open: TestClient | undefined;

afterEach(async () => {
  await open?.close();
  open = undefined;
  restoreEnv();
});

function healthyStack() {
  return stubFetch((call) => {
    if (call.url === 'http://api.test/health') return jsonResponse({ status: 'ok' });
    if (call.url === 'http://hasura.test/healthz') return textResponse('OK');
    if (call.url === 'https://dev.api.trustlesswork.com') return jsonResponse({});
    return jsonResponse({}, 404);
  });
}

describe('check-stack-health', () => {
  it('pings apps/api, Hasura and TrustlessWork and reports all three', async () => {
    const { calls } = healthyStack();
    open = await bootTestClient();

    const result = await open.client.callTool({ name: 'check-stack-health', arguments: {} });

    expect(calls.map((call) => call.url).sort()).toEqual([
      'http://api.test/health',
      'http://hasura.test/healthz',
      'https://dev.api.trustlesswork.com',
    ]);

    const text = textOf(result);
    expect(text).toContain('✅ apps/api http://api.test');
    expect(text).toContain('✅ Hasura http://hasura.test/v1/graphql');
    expect(text).toContain('✅ TrustlessWork https://dev.api.trustlesswork.com');
    expect(text).toContain('Stack is ready for escrow operations.');
    expect(result.isError).toBeFalsy();
  });

  it('flags an unreachable dependency with the local-stack fix', async () => {
    stubFetch((call) => {
      if (call.url === 'http://api.test/health') return jsonResponse({ status: 'ok' });
      if (call.url === 'https://dev.api.trustlesswork.com') return jsonResponse({});
      return textResponse('boom', 503);
    });
    open = await bootTestClient();

    const result = await open.client.callTool({ name: 'check-stack-health', arguments: {} });

    const text = textOf(result);
    expect(text).toContain('❌ Hasura');
    expect(text).toContain('⚠️ One or more services unreachable.');
    expect(text).toContain('cd infra/backend && bin/start safetrust hotel_industry');
  });

  it('treats a network failure as unhealthy rather than throwing', async () => {
    stubFetch(() => {
      throw new TypeError('fetch failed');
    });
    open = await bootTestClient();

    const result = await open.client.callTool({ name: 'check-stack-health', arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain('❌ apps/api');
  });
});
