/**
 * Keeps docs/mcp/README.md honest (#533): the tool catalogue, the configuration
 * table, the docs resource and the "never" list are checked against the code.
 *
 *   pnpm --filter @safetrust/mcp test:boundary
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { assertTestnetHorizon } from '../src/config.js';
import { API_CONTRACT } from '../src/lib/api-contract.js';
import { createSafeTrustServer } from '../src/server.js';
// @ts-expect-error -- plain .mjs helper shared with the docs:env script
import { parseEnvExample, renderDoc } from '../scripts/env-table.mjs';

const mcpDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(mcpDir, '..');
const DOC_PATH = join(repoRoot, 'docs', 'mcp', 'README.md');
const DOC_URI = 'safetrust://docs/safetrust-mcp-trust-boundary';
const doc = readFileSync(DOC_PATH, 'utf8');
const envExample = readFileSync(join(mcpDir, '.env.example'), 'utf8');

/** Every non-test source file under mcp/src, with its contents. */
function sources(dir = join(mcpDir, 'src')): { path: string; text: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|js|mjs)$/.test(name) ? [{ path, text: readFileSync(path, 'utf8') }] : [];
  });
}

type CatalogueRow = { tool: string; safety: string; enabled: string };

function catalogue(): CatalogueRow[] {
  const start = doc.indexOf('<!-- tool-catalogue:begin -->');
  const end = doc.indexOf('<!-- tool-catalogue:end -->');
  assert.ok(start >= 0 && end > start, 'docs/mcp/README.md has no tool-catalogue block');
  const rows = doc
    .slice(start, end)
    .split('\n')
    .filter((line) => /^\|\s*`/.test(line));
  return rows.map((line) => {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    return { tool: cells[0].replace(/`/g, ''), safety: cells[1], enabled: cells[2] };
  });
}

describe('docs/mcp/README.md matches the server (#533)', () => {
  let client: Client;
  let tools: { name: string; annotations?: { readOnlyHint?: boolean } }[];

  before(async () => {
    const { server } = createSafeTrustServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: 'trust-boundary-test', version: '0.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);
    tools = (await client.listTools()).tools;
  });

  after(async () => {
    await client?.close();
  });

  it('lists every tool from tools/list in the catalogue, and nothing else', () => {
    const listed = tools.map((t) => t.name).sort();
    const rows = catalogue();
    const enabled = rows.filter((r) => r.enabled.startsWith('yes')).map((r) => r.tool).sort();
    assert.deepEqual(enabled, listed, 'catalogue rows marked "Enabled by default: yes" must equal tools/list');
    for (const row of rows.filter((r) => !r.enabled.startsWith('yes'))) {
      assert.ok(!listed.includes(row.tool), `${row.tool} is marked off by default but is listed`);
    }
    assert.equal(new Set(rows.map((r) => r.tool)).size, rows.length, 'duplicate catalogue rows');
  });

  it('gives every tool a known safety level, and never marks a writing tool safe', () => {
    for (const row of catalogue()) {
      assert.match(row.safety, /^(✅ safe|⚠️ guarded|❌ unsafe)$/, `${row.tool}: unknown safety "${row.safety}"`);
      const tool = tools.find((t) => t.name === row.tool);
      if (tool && tool.annotations?.readOnlyHint !== true) {
        assert.notEqual(row.safety, '✅ safe', `${row.tool} is not annotated read-only, so it cannot be ✅ safe`);
      }
    }
  });

  it('serves this page as an MCP resource', async () => {
    const { resources } = await client.listResources();
    assert.ok(
      resources.some((r) => r.uri === DOC_URI),
      `resources/list must include ${DOC_URI}`,
    );
    const { contents } = await client.readResource({ uri: DOC_URI });
    assert.equal(contents[0].text, doc);
  });
});

describe('configuration table', () => {
  it('is generated from mcp/.env.example and up to date', () => {
    assert.equal(renderDoc(doc, envExample), doc, 'run `pnpm --filter @safetrust/mcp docs:env`');
  });

  it('documents every environment variable mcp/src reads', () => {
    const documented = parseEnvExample(envExample).map((v: { name: string }) => v.name);
    const read = new Set<string>();
    for (const { text } of sources()) {
      for (const m of text.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\])/g)) {
        read.add(m[1] ?? m[2]);
      }
    }
    for (const name of read) {
      assert.ok(
        documented.includes(name) || envExample.includes(name),
        `${name} is read by mcp/src but missing from mcp/.env.example`,
      );
    }
  });
});

describe('the "never" list holds', () => {
  const src = sources();
  const all = src.map((s) => s.text).join('\n');
  const pkg = JSON.parse(readFileSync(join(mcpDir, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  it('serves stdio only — no HTTP or SSE transport, no listener', () => {
    assert.match(all, /StdioServerTransport/);
    for (const forbidden of [/streamableHttp/i, /server\/sse/i, /\bexpress\b/, /node:https?['"]/, /\.listen\(/]) {
      const hit = src.find((s) => forbidden.test(s.text));
      assert.ok(!hit, `${hit?.path} matches ${forbidden}: the MCP server must stay stdio-only`);
    }
  });

  it('never submits transactions or holds keys', () => {
    assert.ok(!('@stellar/stellar-sdk' in deps), 'mcp/ must not depend on the Stellar SDK');
    // Every apps/api call goes through the route table (src/lib/api-contract.ts),
    // never a hand-written path. The table may hold the two build-only routes
    // and read-only GETs — never send-transaction or any other POST.
    const callers = src.filter((s) => !s.path.endsWith(join('lib', 'api.ts'))).map((s) => s.text).join('\n');
    const apiCalls = [...callers.matchAll(/apiRequest(?:<[\s\S]*?>)?\(\s*([^,)]+)/g)].map((m) => m[1].trim());
    assert.ok(apiCalls.length > 0, 'expected apiRequest calls');
    for (const arg of apiCalls) {
      assert.match(arg, /^`?(\$\{)?routeUrl\('[a-z]+'/, `apiRequest(${arg}): call apps/api through routeUrl()`);
    }
    for (const [name, route] of Object.entries(API_CONTRACT)) {
      if (route.method === 'GET') continue;
      assert.match(
        `${route.mount}${route.path}`,
        /^\/api\/escrow\/(deploy|fund)$/,
        `${name}: ${route.method} ${route.mount}${route.path} — only build-only POST routes are allowed`,
      );
    }
    // The only apps/api routes the MCP may call are the build-only ones.
    const apiCallsFromRoutes = [...all.matchAll(/apiRequest(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]);
    for (const route of apiCallsFromRoutes) {
      assert.match(route, /^\/api\/escrow\/(deploy|fund)$/, `MCP calls ${route}: only build-only routes are allowed`);
    }
    assert.ok(apiCalls.length > 0, 'expected apiRequest calls');
    for (const forbidden of [
      /submitTransaction/,
      /Keypair/,
      /\bsignTransaction\b/,
      /\bS[A-Z2-7]{55}\b/,
    ]) {
      const hit = src.find((s) => forbidden.test(s.text));
      assert.ok(!hit, `${hit?.path} matches ${forbidden}: signing and submitting stay in the wallet`);
    }
  });

  it('ships no end-user UI', () => {
    assert.equal(pkg.private, true);
    for (const ui of ['react', 'react-dom', 'next']) assert.ok(!(ui in deps), `mcp/ must not depend on ${ui}`);
  });

  it('defaults to local URLs only', () => {
    const config = readFileSync(join(mcpDir, 'src', 'config.ts'), 'utf8');
    const urls = [...config.matchAll(/'(https?:\/\/[^']+)'/g)].map((m) => m[1]);
    assert.ok(urls.length > 0);
    // Credentialed endpoints (Hasura, apps/api) default to localhost. The one
    // exception is the public, read-only Testnet Horizon, which
    // assertTestnetHorizon() refuses to swap for a non-Testnet host.
    for (const url of urls) {
      if (url === 'https://horizon-testnet.stellar.org') continue;
      assert.match(url, /^http:\/\/localhost[:/]/, `config.ts default ${url} is not local`);
    }
    assert.throws(() => assertTestnetHorizon('https://horizon.stellar.org'), /Testnet or local Horizon/);
    for (const url of urls) assert.match(url, /^http:\/\/localhost[:/]/, `config.ts default ${url} is not local`);

    const clientConfig = JSON.parse(readFileSync(join(repoRoot, 'mcp.json'), 'utf8'));
    const safetrust = clientConfig.mcpServers.safetrust;
    assert.equal(safetrust.type, 'stdio');
    for (const value of Object.values<string>(safetrust.env ?? {})) {
      if (/^https?:/.test(value)) assert.match(value, /^http:\/\/localhost[:/]/, `mcp.json points at ${value}`);
    }
  });
});

describe('the page itself', () => {
  it('states the trust boundary and every "never" item', () => {
    for (const phrase of [
      'AI client (stdio) → SafeTrust MCP (local)',
      'Wallet signing, submitting and payments: browser + wallet only, never the MCP',
      'runs as a public HTTP MCP server',
      'submits a transaction on its own',
      'holds or uses wallet private keys',
      'ships an end-user UI',
      'points at production URLs',
    ]) {
      assert.ok(doc.includes(phrase), `docs/mcp/README.md must state: ${phrase}`);
    }
  });

  it('covers rotating both credentials', () => {
    assert.match(doc, /Rotate the Hasura admin secret/);
    assert.match(doc, /Rotate the Testnet test user/);
  });

  it('is linked from mcp/README.md', () => {
    assert.match(readFileSync(join(mcpDir, 'README.md'), 'utf8'), /docs\/mcp\/README\.md/);
  });
});
