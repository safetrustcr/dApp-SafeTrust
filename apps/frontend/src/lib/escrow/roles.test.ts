import { describe, expect, it } from 'vitest';
import { resolveEscrowWalletRoles } from './roles';

const GUEST = 'GUEST';
const HOST = 'HOST';
const PLATFORM = 'PLATFORM';

describe('resolveEscrowWalletRoles', () => {
  it('uses the escrow guest and platform fallbacks when Trustless Work roles are null', () => {
    expect(
      resolveEscrowWalletRoles(
        { approver: null, marker: null, releaser: null, resolver: null },
        { senderAddress: GUEST, receiverAddress: HOST, platformAddress: PLATFORM },
      ),
    ).toEqual({
      approver: GUEST,
      serviceProvider: HOST,
      releaseSigner: GUEST,
      disputeResolver: PLATFORM,
    });
  });

  it('prefers the authoritative Trustless Work roles when present', () => {
    expect(
      resolveEscrowWalletRoles(
        { approver: 'A', marker: 'M', releaser: 'R', resolver: 'D' },
        { senderAddress: GUEST, receiverAddress: HOST, platformAddress: PLATFORM },
      ),
    ).toEqual({
      approver: 'A',
      serviceProvider: 'M',
      releaseSigner: 'R',
      disputeResolver: 'D',
    });
  });

  it('does not assign release permission to the platform when the releaser is missing', () => {
    const roles = resolveEscrowWalletRoles(
      { releaser: null, resolver: null },
      { senderAddress: GUEST, receiverAddress: HOST, platformAddress: PLATFORM },
    );

    expect(roles.releaseSigner).toBe(GUEST);
    expect(roles.disputeResolver).toBe(PLATFORM);
  });
});
