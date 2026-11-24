import { beforeEach, describe, expect, it, vi } from 'vitest';

const setCustomUserClaims = vi.fn();
const getUser = vi.fn();
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ setCustomUserClaims, getUser }) }));
vi.mock('../../lib/hasura.js', () => ({ executeGraphQL: vi.fn() }));

import { executeGraphQL } from '../../lib/hasura.js';
import {
  HASURA_CLAIMS_NAMESPACE,
  computeHasuraClaims,
  syncHasuraClaims,
} from '../hasura-claims.js';

describe('computeHasuraClaims', () => {
  it('guest only', () => {
    expect(computeHasuraClaims('u1', ['guest'], null)).toEqual({
      'x-hasura-default-role': 'guest',
      'x-hasura-allowed-roles': ['guest'],
      'x-hasura-user-id': 'u1',
    });
  });

  it('a hotel MANAGER gets hotel_manager in addition to SafeTrust roles', () => {
    const claims = computeHasuraClaims('u2', ['guest', 'host'], 'MANAGER');
    expect(claims['x-hasura-allowed-roles']).toEqual(['host', 'guest', 'hotel_manager']);
    expect(claims['x-hasura-default-role']).toBe('host');
  });

  it('a hotel STAFF user gets read-only hotel_staff in addition to SafeTrust roles', () => {
    expect(computeHasuraClaims('u3', ['guest'], 'STAFF')['x-hasura-allowed-roles']).toEqual(['guest', 'hotel_staff']);
    expect(computeHasuraClaims('u3', ['guest'], 'GUEST')['x-hasura-allowed-roles']).toEqual(['guest']);
  });

  it('admin is the default when present', () => {
    expect(computeHasuraClaims('u4', ['guest', 'admin'], null)['x-hasura-default-role']).toBe('admin');
  });

  it('unknown SafeTrust role names are ignored; empty falls back to guest', () => {
    expect(computeHasuraClaims('u5', ['superuser'], null)['x-hasura-allowed-roles']).toEqual(['guest']);
  });

  it('a manager with no SafeTrust roles still gets a usable default', () => {
    const claims = computeHasuraClaims('u6', [], 'MANAGER');
    expect(claims['x-hasura-allowed-roles']).toEqual(['hotel_manager']);
    expect(claims['x-hasura-default-role']).toBe('hotel_manager');
  });

  it('a staff member with no SafeTrust role defaults to hotel_staff', () => {
    const claims = computeHasuraClaims('u7', [], 'STAFF');
    expect(claims['x-hasura-allowed-roles']).toEqual(['hotel_staff']);
    expect(claims['x-hasura-default-role']).toBe('hotel_staff');
  });
});

describe('syncHasuraClaims', () => {
  beforeEach(() => {
    vi.mocked(executeGraphQL).mockReset();
    setCustomUserClaims.mockReset();
    getUser.mockReset();
  });

  it('reads roles from both tenants and preserves other custom claims', async () => {
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ user_roles: [{ role_id: 2 }], hotel_users: [{ role: 'MANAGER' }] } as never)
      .mockResolvedValueOnce({ roles: [{ name: 'host' }] } as never);
    getUser.mockResolvedValue({ customClaims: { beta: true } });

    const claims = await syncHasuraClaims('uid-9');

    expect(claims['x-hasura-allowed-roles']).toEqual(['host', 'hotel_manager']);
    expect(setCustomUserClaims).toHaveBeenCalledWith('uid-9', {
      beta: true,
      [HASURA_CLAIMS_NAMESPACE]: claims,
    });
  });

  it('skips the role-name lookup when the user has no SafeTrust roles', async () => {
    vi.mocked(executeGraphQL).mockResolvedValueOnce({ user_roles: [], hotel_users: [] } as never);
    getUser.mockResolvedValue({ customClaims: undefined });

    const claims = await syncHasuraClaims('uid-10');

    expect(executeGraphQL).toHaveBeenCalledTimes(1);
    expect(claims['x-hasura-allowed-roles']).toEqual(['guest']);
  });
});
