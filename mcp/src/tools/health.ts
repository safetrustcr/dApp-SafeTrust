import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getHasuraUrl, getSafetrustApiUrl } from '../config.js';
import { auditToolCall } from '../lib/audit.js';
import { describeError, errorResult, textResult } from '../lib/response.js';

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
      auditToolCall('check-stack-health');
      let apiUrl: string;
      let hasuraUrl: string;
      try {
        apiUrl = getSafetrustApiUrl();
        hasuraUrl = getHasuraUrl();
      } catch (error) {
        return errorResult(describeError(error));
      }
      const [api, hasura, tw] = await Promise.all([
        ping(`${apiUrl}/health`),
        ping(`${hasuraUrl.replace('/v1/graphql', '')}/healthz`),
        ping(TW_BASE),
      ]);

      const icon = (ok: boolean) => ok ? '✅' : '❌';
      const allOk = api.ok && hasura.ok && tw.ok;

      return textResult(
        `${icon(api.ok)} apps/api ${apiUrl} (${api.ok ? 'healthy' : 'unreachable'}, ${api.ms}ms)${api.error ? ' — unreachable' : ''}`,
        `${icon(hasura.ok)} Hasura ${hasuraUrl} (${hasura.ok ? 'healthy' : 'unreachable'}, ${hasura.ms}ms)${hasura.error ? ' — unreachable' : ''}`,
        `${icon(tw.ok)} TrustlessWork ${TW_BASE} (${tw.ok ? 'reachable' : 'unreachable'}, ${tw.ms}ms)${tw.error ? ` — ${tw.error}` : ''}`,
        '',
        allOk ? 'Stack is ready for escrow operations.' : '⚠️ One or more services unreachable. Fix before running deploy-escrow.',
        '',
        allOk ? '' : 'If apps/api or Hasura are down: cd infra/backend && bin/start safetrust hotel_industry',
      );
    },
  );
}
