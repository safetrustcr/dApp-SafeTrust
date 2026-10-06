import { describe, expect, it } from 'vitest';
import { hasuraClaimsFor } from './hasura-claims.js';

describe('hasuraClaimsFor', () => {
  it('binds manager access to the verified Firebase UID', () => {
    expect(hasuraClaimsFor('manager-uid', 'MANAGER')).toEqual({
      'x-hasura-default-role': 'MANAGER',
      'x-hasura-allowed-roles': ['MANAGER'],
      'x-hasura-user-id': 'manager-uid',
    });
  });

  it('maps platform administrators to the global read role', () => {
    expect(hasuraClaimsFor('admin-uid', 'admin')).toEqual({
      'x-hasura-default-role': 'platform_admin',
      'x-hasura-allowed-roles': ['platform_admin'],
      'x-hasura-user-id': 'admin-uid',
    });
  });
});