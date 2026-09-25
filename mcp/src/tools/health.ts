import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HASURA_GRAPHQL_URL, SAFETRUST_API_URL } from '../config.js';
import { textResult } from '../lib/response.js';

const TW_BASE = 'https://dev.api.trustlesswork.com';

async function ping(url: string, timeoutMs = 4000): Promise<{ ok: boolean; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok || res.status < 500, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, error: String(err) };
  }
}

export function registerHealthTools(server: McpServer) {
  server.registerTool(
    'check-stack-health',
    {
      title: 'Check stack health',
      description: 'Ping apps/api, Hasura, and TrustlessWork testnet and report their status. ' +
                   'Run this before escrow operations to confirm the full stack is reachable.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const [api, hasura, tw] = await Promise.all([
        ping(`${SAFETRUST_API_URL}/health`),
        ping(`${HASURA_GRAPHQL_URL.replace('/v1/graphql', '')}/healthz`),
        ping(TW_BASE),
      ]);

      const icon = (ok: boolean) => ok ? '✅' : '❌';
      const allOk = api.ok && hasura.ok && tw.ok;

      return textResult(
        `${icon(api.ok)} apps/api ${SAFETRUST_API_URL} (${api.ok ? 'healthy' : 'unreachable'}, ${api.ms}ms)${api.error ? ` — ${api.error}` : ''}`,
        `${icon(hasura.ok)} Hasura ${HASURA_GRAPHQL_URL} (${hasura.ok ? 'healthy' : 'unreachable'}, ${hasura.ms}ms)${hasura.error ? ` — ${hasura.error}` : ''}`,
        `${icon(tw.ok)} TrustlessWork ${TW_BASE} (${tw.ok ? 'reachable' : 'unreachable'}, ${tw.ms}ms)${tw.error ? ` — ${tw.error}` : ''}`,
        '',
        allOk ? 'Stack is ready for escrow operations.' : '⚠️ One or more services unreachable. Fix before running deploy-escrow.',
        '',
        allOk ? '' : 'If apps/api or Hasura are down: cd infra/backend && bin/start safetrust hotel_industry',
      );
    },
  );
}
