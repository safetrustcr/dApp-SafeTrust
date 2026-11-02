import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

describe('escrow mutation tool safety', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns an error and makes no HTTP request while mutations are disabled', async () => {
    vi.stubEnv('SAFETRUST_MCP_ALLOW_MUTATIONS', 'false');
    vi.resetModules();

    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const handlers = new Map<string, ToolHandler>();
    const server = {
      registerTool: (
        name: string,
        _config: unknown,
        handler: ToolHandler,
      ) => handlers.set(name, handler),
    } as unknown as McpServer;
    const { registerEscrowTools } = await import('../src/tools/escrow.js');
    registerEscrowTools(server);

    const deploy = await handlers.get('deploy-escrow')!({
      apartmentId: '2fa85f64-5717-4562-b3fc-2c963f66afa6',
      senderAddress: 'GAOQJGUAB7NI7K7I62ORBXMN3J4HOUX3CB2IA7V6M6YVBN5UCDJUR6Z6',
    });
    const fund = await handlers.get('fund-escrow')!({
      engagementId: 'rental:test-engagement',
    });

    expect(deploy.isError).toBe(true);
    expect(fund.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses mutations when the API reports a non-Testnet network', async () => {
    vi.stubEnv('SAFETRUST_MCP_ALLOW_MUTATIONS', 'true');
    vi.resetModules();

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', stellarNetwork: 'PUBLIC' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const handlers = new Map<string, ToolHandler>();
    const server = {
      registerTool: (
        name: string,
        _config: unknown,
        handler: ToolHandler,
      ) => handlers.set(name, handler),
    } as unknown as McpServer;
    const { registerEscrowTools } = await import('../src/tools/escrow.js');
    registerEscrowTools(server);

    const result = await handlers.get('deploy-escrow')!({
      apartmentId: '2fa85f64-5717-4562-b3fc-2c963f66afa6',
      senderAddress: 'GAOQJGUAB7NI7K7I62ORBXMN3J4HOUX3CB2IA7V6M6YVBN5UCDJUR6Z6',
    });

    expect(result.isError).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });
});
