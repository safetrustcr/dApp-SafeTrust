import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { loadSafeTrustDocs } from '../../src/resources/docs-loader.js';
import { registerApartmentTools } from '../../src/tools/apartments.js';
import { registerEscrowTools } from '../../src/tools/escrow.js';
import { registerHasuraTools } from '../../src/tools/hasura.js';

export const INTEGRATION_ENABLED =
  Boolean(process.env.HASURA_GRAPHQL_URL) &&
  Boolean(process.env.HASURA_ADMIN_SECRET);

export async function createTestClient() {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerEscrowTools(server);
  registerApartmentTools(server);
  registerHasuraTools(server);
  loadSafeTrustDocs(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '0.0.1' }, { capabilities: {} });
  await client.connect(clientTransport);

  return { client, server };
}
