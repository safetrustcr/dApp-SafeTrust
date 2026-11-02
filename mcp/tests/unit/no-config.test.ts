import { afterEach, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv } from '../helpers/env.js';
import { stubFetch } from '../helpers/fetch.js';
import { listToolNames, textOf, type TestClient } from '../helpers/mcp.js';

/** Every variable the server reads for Hasura or apps/api, unset. */
const NO_CONFIG = {
  HASURA_GRAPHQL_URL: undefined,
  HASURA_ADMIN_SECRET: undefined,
  HASURA_GRAPHQL_ADMIN_SECRET: undefined,
  SAFETRUST_API_URL: undefined,
  SAFETRUST_MCP_ALLOWED_HOSTS: undefined,
};

let open: TestClient | undefined;

afterEach(async () => {
  await open?.close();
  open = undefined;
  restoreEnv();
});

describe('server with no configuration', () => {
  it('starts, lists tools and serves docs', async () => {
    open = await bootTestClient(NO_CONFIG);

    expect(await listToolNames(open.client)).toContain('get-escrow-status');

    const architecture = await open.client.readResource({ uri: 'safetrust://docs/architecture' });
    expect(String(architecture.contents[0].text)).toContain('# SafeTrust architecture context');
  });

  it('fails Hasura tools closed, naming the missing variable and never calling out', async () => {
    const { fetchMock } = stubFetch();
    open = await bootTestClient({ ...NO_CONFIG, HASURA_GRAPHQL_URL: 'http://localhost:8080/v1/graphql' });

    const result = await open.client.callTool({ name: 'query-escrows', arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/^HASURA_ADMIN_SECRET is not set.*See mcp\/README\.md#configuration\.$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a remote Hasura before sending the admin secret anywhere', async () => {
    const { fetchMock } = stubFetch();
    open = await bootTestClient({
      ...NO_CONFIG,
      HASURA_GRAPHQL_URL: 'https://hasura.example.com/v1/graphql',
      HASURA_ADMIN_SECRET: 'local-secret',
    });

    const result = await open.client.callTool({ name: 'query-escrows', arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('Remote hosts are disabled for the MCP.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
