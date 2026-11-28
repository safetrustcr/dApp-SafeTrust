import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./roles', () => ({
  DEFAULT_ROLE: 'guest',
  isUserRole: (v: unknown): v is string =>
    v === 'guest' || v === 'host' || v === 'admin',
  resolveHighestRole: (names: (string | undefined)[]) => {
    if (names.includes('admin')) return 'admin';
    if (names.includes('host')) return 'host';
    return 'guest';
  },
}));

import { fetchUserRole } from './fetch-user-role';

describe('fetchUserRole', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // ── Required: set env var so the early-exit guard doesn't fire ──
    process.env.HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.HASURA_GRAPHQL_URL;
  });

  it('returns role name when Hasura returns user_roles with a role', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { user_roles: [{ role: { name: 'host' } }] } }),
        { status: 200 },
      ),
    );

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('host');
  });

  it('returns guest when Hasura returns empty user_roles array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { user_roles: [] } }),
        { status: 200 },
      ),
    );

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
  });

  it('returns guest and logs error when fetch throws', async () => {
    const networkError = new Error('Network error');
    vi.mocked(fetch).mockRejectedValueOnce(networkError);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
    expect(consoleSpy).toHaveBeenCalledWith(
      'fetchUserRole: failed to reach Hasura or request failed',
      networkError,
    );
  });

  it('returns guest and logs error when response.ok is false', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    );

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
    expect(consoleSpy).toHaveBeenCalledWith(
      'fetchUserRole: Hasura returned non-ok HTTP status 401',
    );
  });

  it('returns guest and logs error when Hasura returns errors field', async () => {
    const errors = [{ message: 'Some error' }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ errors }), { status: 200 }),
    );

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
    expect(consoleSpy).toHaveBeenCalledWith(
      'fetchUserRole: Hasura returned GraphQL errors',
      errors,
    );
  });

  it('resolves the highest-privilege role when a user holds several', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            user_roles: [
              { role: { name: 'guest' } },
              { role: { name: 'host' } },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('host');
  });

  it('resolves admin over host regardless of row order', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            user_roles: [
              { role: { name: 'host' } },
              { role: { name: 'admin' } },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('admin');
  });

  it('ignores role names outside the known vocabulary', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { user_roles: [{ role: { name: 'superuser' } }] },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
  });

  it('returns guest without querying Hasura when uid is empty', async () => {
    const result = await fetchUserRole('');
    expect(result).toBe('guest');
    expect(fetch).not.toHaveBeenCalled();
  });
});