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

  it('returns guest when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
  });

  it('returns guest when response.ok is false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
  });

  it('returns guest when Hasura returns errors field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [{ message: 'Some error' }],
      }),
    } as unknown as Response);

    const result = await fetchUserRole('test-uid');
    expect(result).toBe('guest');
  });
});