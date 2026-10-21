import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HASURA_GRAPHQL_URL, SAFETRUST_API_URL } from '../config.js';
import { routeUrl } from '../lib/api-contract.js';
import { textResult } from '../lib/response.js';

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
      description: 'Ping apps/api and Hasura and report their status. Run this before escrow ' +
                   'operations. Trustless Work is reached only through apps/api, never by the MCP.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const [api, hasura] = await Promise.all([
        ping(`${SAFETRUST_API_URL}${routeUrl('health')}`),
        ping(`${HASURA_GRAPHQL_URL.replace('/v1/graphql', '')}/healthz`),
      ]);

      const icon = (ok: boolean) => ok ? '✅' : '❌';
      const allOk = api.ok && hasura.ok;

      return textResult(
        `${icon(api.ok)} apps/api ${SAFETRUST_API_URL} (${api.ok ? 'healthy' : 'unreachable'}, ${api.ms}ms)${api.error ? ` — ${api.error}` : ''}`,
        `${icon(hasura.ok)} Hasura ${HASURA_GRAPHQL_URL} (${hasura.ok ? 'healthy' : 'unreachable'}, ${hasura.ms}ms)${hasura.error ? ` — ${hasura.error}` : ''}`,
        '',
        allOk ? 'Stack is ready for escrow operations.' : '⚠️ One or more services unreachable. Fix before running deploy-escrow.',
        '',
        allOk ? '' : 'If apps/api or Hasura are down: cd infra/backend && bin/start safetrust hotel_industry; pnpm --filter @safetrust/api dev',
      );
    },
  );
}
