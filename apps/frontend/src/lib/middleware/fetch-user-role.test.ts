import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

import { fetchUserRole } from './fetch-user-role';

const mockFetch = vi.mocked(fetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchUserRole', () => {
  it('returns role name when Hasura returns user_roles with a role', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user_roles: [{ role: { name: 'host' } }],
        },
      }),
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('host');
  });

  it('returns guest when Hasura returns empty user_roles array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user_roles: [],
        },
      }),
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
  });

  it('returns guest and logs error when fetch throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const networkError = new Error('Network error');
    mockFetch.mockRejectedValueOnce(networkError);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
    expect(consoleSpy).toHaveBeenCalledWith(
      'fetchUserRole: failed to reach Hasura or request failed',
      networkError,
    );
    consoleSpy.mockRestore();
  });

  it('returns guest and logs error when response.ok is false', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
    expect(consoleSpy).toHaveBeenCalledWith(
      'fetchUserRole: Hasura returned non-ok HTTP status 401',
    );
    consoleSpy.mockRestore();
  });

  it('returns guest and logs error when Hasura returns errors field', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errors = [{ message: 'Some error' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors,
      }),
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
    expect(consoleSpy).toHaveBeenCalledWith(
      'fetchUserRole: Hasura returned GraphQL errors',
      errors,
    );
    consoleSpy.mockRestore();
  });

  it('resolves the highest-privilege role when a user holds several', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user_roles: [{ role: { name: 'guest' } }, { role: { name: 'host' } }],
        },
      }),
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('host');
  });

  it('resolves admin over host regardless of row order', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user_roles: [{ role: { name: 'admin' } }, { role: { name: 'host' } }],
        },
      }),
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('admin');
  });

  it('ignores role names outside the known vocabulary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user_roles: [{ role: { name: 'superuser' } }],
        },
      }),
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
  });

  it('returns guest without querying Hasura when uid is empty', async () => {
    const result = await fetchUserRole('');
    expect(result).toBe('guest');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});