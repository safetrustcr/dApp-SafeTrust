import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { loadSafeTrustDocs } from '../../src/resources/docs-loader.js';
import { registerApartmentTools } from '../../src/tools/apartments.js';
import { registerEscrowTools } from '../../src/tools/escrow.js';
import { registerHasuraTools } from '../../src/tools/hasura.js';
import { registerHealthTools } from '../../src/tools/health.js';

export type TestClient = {
  client: Client;
  server: McpServer;
  close: () => Promise<void>;
};

/**
 * The same registration the stdio entrypoint performs, wired to an in-memory
 * transport so tests exercise the real MCP protocol (schemas, tool listing,
 * isError semantics) without spawning a process.
 */
export async function createTestClient(): Promise<TestClient> {
  const server = new McpServer({ name: 'safetrust-test', version: '0.0.1' });

  registerEscrowTools(server);
  registerApartmentTools(server);
  registerHasuraTools(server);
  registerHealthTools(server);
  loadSafeTrustDocs(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '0.0.1' }, { capabilities: {} });
  await client.connect(clientTransport);

  return {
    client,
    server,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

export async function listToolNames(client: Client): Promise<string[]> {
  const { tools } = await client.listTools();
  return tools.map((tool) => tool.name).sort();
}

export function textOf(result: CallToolResult): string {
  return result.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n');
}

/** Parses the first ```json fenced block a tool rendered. */
export function jsonOf<T = unknown>(result: CallToolResult): T {
  const match = textOf(result).match(/```json\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`No JSON block in tool output:\n${textOf(result)}`);
  return JSON.parse(match[1]) as T;
}
