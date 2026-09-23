import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { HASURA_GRAPHQL_URL, SAFETRUST_API_URL } from '../config.js';
import { textResult } from '../lib/response.js';

/**
 * TrustlessWork's base URL. apps/api reads TRUSTLESS_WORK_API_URL with the same
 * default (apps/api/src/lib/trustlesswork.ts), so a developer who points the API
 * at a different environment gets the health check pointed there too.
 */
const TRUSTLESS_WORK_URL =
  process.env.TRUSTLESS_WORK_API_URL ?? 'https://dev.api.trustlesswork.com';

/** Per-service timeout. A diagnostic that hangs is worse than one that says "down". */
const PING_TIMEOUT_MS = 4_000;

/**
 * Hasura's health endpoint sits beside the GraphQL one, so it is derived rather
 * than configured separately: whatever HASURA_GRAPHQL_URL points at is what gets
 * checked.
 */
function hasuraHealthUrl(): string {
  try {
    const url = new URL(HASURA_GRAPHQL_URL);
    url.pathname = '/healthz';
    url.search = '';
    return url.toString();
  } catch {
    return 'http://localhost:8080/healthz';
  }
}

type Ping = { ok: boolean; ms: number; detail: string };

/**
 * A 4xx still means the service answered, which is what this tool is asking.
 * Only a 5xx or a failure to connect counts as down.
 */
async function ping(url: string): Promise<Ping> {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
    const ms = Date.now() - started;
    return {
      ok: res.status < 500,
      ms,
      detail: res.ok ? `healthy, ${ms}ms` : `HTTP ${res.status}, ${ms}ms`,
    };
  } catch (error) {
    const ms = Date.now() - started;
    const name = error instanceof Error ? error.name : '';
    const reason = name === 'TimeoutError' ? `no answer in ${PING_TIMEOUT_MS}ms` : 'unreachable';
    return { ok: false, ms, detail: reason };
  }
}

function row(mark: string, name: string, url: string, detail: string): string {
  return `${mark} ${name.padEnd(16)} ${url.padEnd(34)} (${detail})`;
}

export function registerHealthTools(server: McpServer) {
  server.registerTool(
    'check-stack-health',
    {
      title: 'Check stack health',
      description:
        'Pings apps/api, Hasura and TrustlessWork and reports whether the stack is ' +
        'ready for escrow operations. Run this first when deploy-escrow or ' +
        'fund-escrow fails, to tell a service being down from a bad request.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const apiUrl = `${SAFETRUST_API_URL}/health`;
      const hasuraUrl = hasuraHealthUrl();

      // Concurrently: three sequential 4s timeouts would make a diagnostic
      // slower than the operation it is diagnosing.
      const [api, hasura, trustlessWork] = await Promise.all([
        ping(apiUrl),
        ping(hasuraUrl),
        ping(TRUSTLESS_WORK_URL),
      ]);

      const lines = [
        row(api.ok ? '✅' : '❌', 'apps/api', SAFETRUST_API_URL, api.detail),
        row(hasura.ok ? '✅' : '❌', 'Hasura', new URL(hasuraUrl).origin, hasura.detail),
        row(
          trustlessWork.ok ? '✅' : '❌',
          'TrustlessWork',
          new URL(TRUSTLESS_WORK_URL).host,
          trustlessWork.detail,
        ),
        '',
      ];

      const down = [
        api.ok ? null : 'apps/api',
        hasura.ok ? null : 'Hasura',
        trustlessWork.ok ? null : 'TrustlessWork',
      ].filter((name): name is string => name !== null);

      if (down.length === 0) {
        lines.push('Stack is ready for escrow operations.');
      } else {
        lines.push(`Not ready: ${down.join(', ')} ${down.length === 1 ? 'is' : 'are'} not answering.`);
        if (!api.ok || !hasura.ok) {
          lines.push('Start the local stack with `make full`, or `make infra` then `pnpm run dev`.');
        }
      }

      return textResult(...lines);
    },
  );
}
