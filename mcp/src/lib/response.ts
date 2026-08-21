import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** Successful tool result — one text block, one line per argument. */
export function textResult(...lines: string[]): CallToolResult {
  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

/** Failed tool result. isError lets the client show the model the failure. */
export function errorResult(...lines: string[]): CallToolResult {
  return { content: [{ type: 'text', text: lines.join('\n') }], isError: true };
}

/** Renders rows as a fenced JSON block so the model gets the raw field names. */
export function jsonBlock(value: unknown): string {
  return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
