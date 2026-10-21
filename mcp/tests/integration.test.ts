import test from 'node:test';
import assert from 'node:assert';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerHealthTools } from '../src/tools/health.js';

test('check-stack-health is registered and callable', async () => {
  const server = new McpServer({
    name: 'test-safetrust',
    version: '0.1.0',
  });

  registerHealthTools(server);
  
  // We cannot easily test the exact network response of the real Hasura/API without mocking, 
  // but we can ensure the tool runs and returns the expected textResult shape.
  // Since this is an integration test, it might actually hit the network.
  // If servers are down, it'll still return a response showing them down.
  // We'll just verify it doesn't crash and returns the correct format.
  
  const toolResult = await server.server.callTool({
    name: 'check-stack-health',
    arguments: {}
  });

  assert.ok(toolResult);
  assert.ok(toolResult.content);
  assert.strictEqual(toolResult.content[0].type, 'text');
  assert.ok(typeof toolResult.content[0].text === 'string');
  
  const output = toolResult.content[0].text;
  assert.ok(output.includes('apps/api'));
  assert.ok(output.includes('Hasura'));
  assert.ok(output.includes('TrustlessWork'));
});
