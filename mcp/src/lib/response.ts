import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpConfigError } from '../config.js';
import { redactText, redactXdr, type RedactOptions } from './redact.js';

/** Successful tool result — one text block, one line per argument. */
export function textResult(...lines: string[]): CallToolResult {
  return textResultWithOptions({}, ...lines);
}

/** Use only for MCP operations intentionally returning an unsigned XDR. */
export function textResultWithOptions(options: RedactOptions, ...lines: string[]): CallToolResult {
  return { content: [{ type: 'text', text: redactText(lines.filter(Boolean).join('\n'), options) }] };
}

/** Failed tool result. isError lets the client show the model the failure. */
export function errorResult(...lines: string[]): CallToolResult {
  return { content: [{ type: 'text', text: redactText(lines.filter(Boolean).join('\n')) }], isError: true };
}

/**
 * Renders rows as a fenced JSON block so the model gets the raw field names.
 * Unsigned XDRs are withheld unless the caller is a build tool.
 */
export function jsonBlock(value: unknown, options: RedactOptions = {}): string {
  const safe = options.allowUnsignedXdr ? value : redactXdr(value);
  return redactText(['```json', JSON.stringify(safe, null, 2), '```'].join('\n'), options);
}

/** Errors whose messages are fixed strings written in this package, never upstream data. */
const SAFE_ERRORS = new Set(['McpConfigError', 'ApiRequestError', 'HasuraRequestError']);

export function describeError(error: unknown): string {
  if (error instanceof McpConfigError) return error.message;
  if (error instanceof Error && SAFE_ERRORS.has(error.name)) return error.message;
  return 'Request failed. Check MCP configuration and local service status.';
}
