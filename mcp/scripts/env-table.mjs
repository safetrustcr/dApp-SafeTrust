#!/usr/bin/env node
/**
 * Renders the "Configuration" table in docs/mcp/README.md from mcp/.env.example,
 * so the variables a contributor is told to set — and what each one grants — come
 * from one file.
 *
 *   node scripts/env-table.mjs           # check: exit 1 if the doc is stale
 *   node scripts/env-table.mjs --write   # rewrite the table in place
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mcpDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_EXAMPLE = join(mcpDir, '.env.example');
export const DOC = join(mcpDir, '..', 'docs', 'mcp', 'README.md');
const BEGIN = '<!-- env-table:begin (generated from mcp/.env.example by `pnpm --filter @safetrust/mcp docs:env`) -->';
const END = '<!-- env-table:end -->';

/** Parses `# @key value` comment blocks followed by a `KEY=` or `# KEY=` line. */
export function parseEnvExample(text) {
  const vars = [];
  let meta = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const tag = line.match(/^#\s*@(\w+)\s+(.*)$/);
    if (tag) {
      meta[tag[1]] = tag[2].trim();
      continue;
    }
    const assignment = line.match(/^(#\s*)?([A-Z][A-Z0-9_]*)=(.*)$/);
    if (assignment && Object.keys(meta).length > 0) {
      vars.push({
        name: assignment[2],
        example: assignment[1] ? null : assignment[3],
        required: meta.required ?? 'no',
        default: meta.default ?? 'unset',
        grants: meta.grants ?? '',
      });
    }
    if (!line.startsWith('#') || assignment) meta = {};
  }
  return vars;
}

const cell = (s) => String(s).replace(/\|/g, '\\|');

export function renderTable(vars) {
  return [
    '| Variable | Required | Default | What it grants |',
    '|---|---|---|---|',
    ...vars.map((v) => `| \`${v.name}\` | ${cell(v.required)} | ${cell(v.default)} | ${cell(v.grants)} |`),
  ].join('\n');
}

export function renderDoc(doc, envText) {
  const start = doc.indexOf(BEGIN);
  const end = doc.indexOf(END);
  if (start < 0 || end < start) throw new Error(`docs/mcp/README.md has no ${BEGIN} … ${END} block`);
  return `${doc.slice(0, start)}${BEGIN}\n${renderTable(parseEnvExample(envText))}\n${doc.slice(end)}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const doc = readFileSync(DOC, 'utf8');
  const next = renderDoc(doc, readFileSync(ENV_EXAMPLE, 'utf8'));
  if (process.argv.includes('--write')) {
    writeFileSync(DOC, next);
    console.log(next === doc ? 'docs/mcp/README.md already up to date.' : 'Updated docs/mcp/README.md.');
  } else if (next !== doc) {
    console.error('docs/mcp/README.md is stale: run `pnpm --filter @safetrust/mcp docs:env`.');
    process.exit(1);
  } else {
    console.log('docs/mcp/README.md configuration table matches mcp/.env.example.');
  }
}
