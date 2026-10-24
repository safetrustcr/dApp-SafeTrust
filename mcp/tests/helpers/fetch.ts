import { vi } from 'vitest';

export type RecordedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers } as Record<string, string>;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function textResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

/**
 * Replaces global fetch. Every outbound request is recorded so tests can assert
 * the exact URL/headers/body the server produced, and no socket is ever opened.
 */
export function stubFetch(
  handler: (call: RecordedCall) => Response | Promise<Response> = () =>
    jsonResponse({ data: {} }),
): { calls: RecordedCall[]; fetchMock: ReturnType<typeof vi.fn> } {
  const calls: RecordedCall[] = [];

  const fetchMock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const call: RecordedCall = {
      url: String(input),
      method: init.method ?? 'GET',
      headers: normalizeHeaders(init.headers),
      body: typeof init.body === 'string' ? init.body : undefined,
    };
    calls.push(call);
    return handler(call);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** Requests the code under test sent, newest last. */
export function hasuraCalls(calls: RecordedCall[]): RecordedCall[] {
  return calls.filter((call) => call.url.includes('/v1/graphql'));
}

/** GraphQL documents sent to Hasura, in order. */
export function graphqlDocuments(calls: RecordedCall[]): string[] {
  return hasuraCalls(calls).map((call) => {
    const parsed = call.body ? (JSON.parse(call.body) as { query?: string }) : {};
    return parsed.query ?? '';
  });
}
