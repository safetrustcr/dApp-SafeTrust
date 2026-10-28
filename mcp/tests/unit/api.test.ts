import { afterEach, describe, expect, it } from 'vitest';

import { jsonResponse, stubFetch, textResponse } from '../helpers/fetch.js';
import { loadFresh, restoreEnv } from '../helpers/env.js';

type ApiModule = typeof import('../../src/lib/api.js');

const BASE = 'http://api.test';

function loadApi(env: Record<string, string | undefined> = {}): Promise<ApiModule> {
  return loadFresh<ApiModule>(
    { SAFETRUST_API_URL: BASE, ...env },
    () => import('../../src/lib/api.js'),
  );
}

afterEach(restoreEnv);

describe('apiRequest', () => {
  it('GETs the configured base URL and parses the JSON body', async () => {
    const { calls } = stubFetch(() => jsonResponse({ status: 'ok' }));
    const { apiRequest } = await loadApi();

    const result = await apiRequest('/health');

    expect(result).toEqual({ ok: true, status: 200, data: { status: 'ok' } });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE}/health`);
    expect(calls[0].method).toBe('GET');
    expect(calls[0].body).toBeUndefined();
    expect(calls[0].headers['Content-Type']).toBeUndefined();
  });

  it('serializes POST bodies as JSON', async () => {
    const { calls } = stubFetch(() => jsonResponse({ engagementId: 'eng-1' }));
    const { apiRequest } = await loadApi();

    await apiRequest('/api/escrow/deploy', {
      method: 'POST',
      body: { apartmentId: 'apt-1', senderAddress: 'G…' },
    });

    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({
      apartmentId: 'apt-1',
      senderAddress: 'G…',
    });
  });

  it('returns non-2xx responses instead of throwing, so tools can relay the API message', async () => {
    stubFetch(() => jsonResponse({ error: 'Escrow not found.' }, 404));
    const { apiRequest } = await loadApi();

    const result = await apiRequest('/api/escrow/fund', { method: 'POST', body: {} });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.data).toEqual({ error: 'Escrow not found.' });
  });

  it('parses an empty body as an empty object', async () => {
    stubFetch(() => new Response(null, { status: 204 }));
    const { apiRequest } = await loadApi();

    const result = await apiRequest('/health');

    expect(result.data).toEqual({});
  });

  it('wraps transport failures in ApiRequestError with the URL and the fix', async () => {
    stubFetch(() => {
      throw new TypeError('fetch failed');
    });
    const { apiRequest, ApiRequestError } = await loadApi();

    await expect(apiRequest('/api/escrow/deploy', { method: 'POST', body: {} })).rejects.toThrow(
      ApiRequestError,
    );
    await expect(apiRequest('/api/escrow/deploy', { method: 'POST', body: {} })).rejects.toThrow(
      `Cannot reach apps/api at ${BASE}/api/escrow/deploy`,
    );
  });

  it('rejects non-JSON responses and keeps only a short excerpt', async () => {
    const html = `<html>${'x'.repeat(400)}</html>`;
    stubFetch(() => textResponse(html, 502));
    const { apiRequest, ApiRequestError } = await loadApi();

    const error = await apiRequest('/health').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    const message = (error as Error).message;
    expect(message).toContain('non-JSON response (502)');
    expect(message).toContain(html.slice(0, 200));
    expect(message).not.toContain(html.slice(0, 201));
  });
});
