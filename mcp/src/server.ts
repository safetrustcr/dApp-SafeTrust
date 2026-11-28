import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { loadSafeTrustDocs } from './resources/docs-loader.js';
import { registerApartmentTools } from './tools/apartments.js';
import { registerEscrowDiagnosticsTools } from './tools/escrow-diagnostics.js';
import { registerEscrowTools } from './tools/escrow.js';
import { registerHasuraTools } from './tools/hasura.js';
import { registerHealthTools } from './tools/health.js';

/**
 * Builds the SafeTrust MCP server with every tool and resource it ships.
 *
 * Kept separate from the stdio entry point (index.ts) so tests can list exactly
 * what a client would see — the tool catalogue in docs/mcp/README.md is checked
 * against this server's `tools/list`.
 */
export function createSafeTrustServer() {
  const server = new McpServer({
    name: 'safetrust',
    version: '0.1.0',
  });

  registerEscrowTools(server);
  registerEscrowDiagnosticsTools(server);
  registerApartmentTools(server);
  registerHasuraTools(server);
  registerHealthTools(server);

  const docs = loadSafeTrustDocs(server);

  return { server, docs };
}
