#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { HASURA_GRAPHQL_URL, SAFETRUST_API_URL } from './config.js';
import { loadSafeTrustDocs } from './resources/docs-loader.js';
import { registerApartmentTools } from './tools/apartments.js';
import { registerEscrowTools } from './tools/escrow.js';
import { registerHasuraTools } from './tools/hasura.js';

const server = new McpServer({
  name: 'safetrust',
  version: '0.1.0',
});

registerEscrowTools(server);
registerApartmentTools(server);
registerHasuraTools(server);

const docs = loadSafeTrustDocs(server);

// stdout carries the JSON-RPC stream — every log line has to go to stderr.
console.error('[safetrust-mcp] repo root:', docs.root);
console.error('[safetrust-mcp] hasura:', HASURA_GRAPHQL_URL);
console.error('[safetrust-mcp] api:', SAFETRUST_API_URL);
console.error(`[safetrust-mcp] ${docs.registered} resource(s) registered`);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('[safetrust-mcp] server running on stdio');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().finally(() => process.exit(0));
  });
}
