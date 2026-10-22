/** Emit one data-free audit line per MCP tool invocation. */
export function auditToolCall(tool: string): void {
  console.error(JSON.stringify({ event: 'mcp_tool_call', tool }));
}
