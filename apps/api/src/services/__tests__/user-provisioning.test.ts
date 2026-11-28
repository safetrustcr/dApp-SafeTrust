import { describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/hasura.js', () => ({ executeGraphQL: vi.fn() }));
vi.mock('../hasura-claims.js', () => ({ syncHasuraClaims: vi.fn() }));
import { executeGraphQL } from '../../lib/hasura.js';
import { syncHasuraClaims } from '../hasura-claims.js';
import { ensureUserRole } from '../user-provisioning.js';
describe('ensureUserRole', () => {
  it('assigns the role then refreshes claims', async () => {
    vi.mocked(executeGraphQL).mockResolvedValueOnce({ roles: [{ id: 1 }] } as never).mockResolvedValueOnce({} as never);
    await ensureUserRole('u1', 'guest');
    expect(syncHasuraClaims).toHaveBeenCalledWith('u1');
  });
  it('a claims failure never blocks role assignment', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(executeGraphQL).mockResolvedValueOnce({ roles: [{ id: 1 }] } as never).mockResolvedValueOnce({} as never);
    vi.mocked(syncHasuraClaims).mockRejectedValueOnce(new Error('no firebase user'));
    await expect(ensureUserRole('u2', 'host')).resolves.toBeUndefined();
  });
});