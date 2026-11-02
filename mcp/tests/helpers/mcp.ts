import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { createSafeTrustServer } from '../../src/server.js';

export type TestClient = {
  client: Client;
  server: McpServer;
  close: () => Promise<void>;
};

/**
 * The same server the stdio entrypoint builds, wired to an in-memory
 * transport so tests exercise the real MCP protocol (schemas, tool listing,
 * isError semantics) without spawning a process.
 */
export async function createTestClient(): Promise<TestClient> {
  const { server } = createSafeTrustServer();

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
