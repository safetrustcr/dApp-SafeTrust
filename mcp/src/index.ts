#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { configurationSummary } from './config.js';
import { createSafeTrustServer } from './server.js';

// stdio only, by design: this is local developer tooling for one client on one
// machine. See docs/mcp/README.md ("Trust boundary") before adding a transport.
const { server, docs } = createSafeTrustServer();

// stdout carries the JSON-RPC stream — every log line has to go to stderr.
console.error('[safetrust-mcp] repo root:', docs.root);
console.error(`[safetrust-mcp] ${configurationSummary()}`);
console.error(`[safetrust-mcp] ${docs.registered} resource(s) registered`);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('[safetrust-mcp] server running on stdio');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().finally(() => process.exit(0));
  });
}
