import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hasura.js', () => ({ hasuraRequest: vi.fn() }));

import { hasuraRequest } from '../hasura.js';
import {
  ACTION_ROLE,
  assertEscrowParticipant,
  authorizeEscrowAction,
  EscrowAccessError,
  isParticipant,
  resolveSigner,
  rolesFor,
  type EscrowAction,
} from '../escrow-authz.js';

const GUEST = 'GGUEST000000000000000000000000000000000000000000000000000';
const HOST = 'GHOST0000000000000000000000000000000000000000000000000000';
const PLATFORM = 'GPLATFORM000000000000000000000000000000000000000000000000';
const STRANGER = 'GSTRANGER000000000000000000000000000000000000000000000000';

const escrow = {
  id: 'e1',
  engagement_id: 'eng-1',
  contract_id: 'CCONTRACT',
  sender_address: GUEST,
  receiver_address: HOST,
  amount: 950,
  status: 'funded',
};
const roles = rolesFor(escrow, PLATFORM);

// Who may build each action — every row of ACTION_ROLE is covered.
const TABLE: Array<[EscrowAction, string, string[]]> = [
  ['initialize', GUEST, [HOST, PLATFORM, STRANGER]],
  ['fund', GUEST, [HOST, PLATFORM, STRANGER]],
  ['mark_milestone_completed', HOST, [GUEST, PLATFORM, STRANGER]],
  ['approve_milestone', GUEST, [HOST, PLATFORM, STRANGER]],
  ['release_funds', GUEST, [HOST, PLATFORM, STRANGER]],
  ['resolve_dispute', PLATFORM, [GUEST, HOST, STRANGER]],
];

describe('ACTION_ROLE table', () => {
  it('covers every action', () => {
    expect(TABLE.map(([a]) => a).sort()).toEqual(Object.keys(ACTION_ROLE).sort());
  });

  it.each(TABLE)('%s: allowed wallet resolves as signer, others get 403', (action, allowed, denied) => {
    expect(resolveSigner([allowed], roles, action)).toBe(allowed);
    expect(resolveSigner([STRANGER, allowed], roles, action)).toBe(allowed); // multiple wallets
    for (const wallet of denied) {
      expect(() => resolveSigner([wallet], roles, action)).toThrow(EscrowAccessError);
      try {
        resolveSigner([wallet], roles, action);
      } catch (err) {
        expect((err as EscrowAccessError).status).toBe(403);
      }
    }
  });

  it('no registered wallets → 403', () => {
    expect(() => resolveSigner([], roles, 'fund')).toThrow(EscrowAccessError);
  });
});

describe('rolesFor', () => {
  it('maps sender → approver/releaseSigner, receiver → serviceProvider, platform → disputeResolver', () => {
    expect(roles).toEqual({ approver: GUEST, serviceProvider: HOST, releaseSigner: GUEST, disputeResolver: PLATFORM });
  });

  it('fails closed without PLATFORM_STELLAR_ADDRESS', () => {
    expect(() => rolesFor(escrow, '')).toThrow(EscrowAccessError);
  });
});

describe('isParticipant', () => {
  it('true for any role holder, false otherwise', () => {
    expect(isParticipant([HOST], roles)).toBe(true);
    expect(isParticipant([STRANGER], roles)).toBe(false);
  });
});

describe('authorizeEscrowAction (data access)', () => {
  beforeEach(() => {
    vi.mocked(hasuraRequest).mockReset();
    process.env.PLATFORM_STELLAR_ADDRESS = PLATFORM;
  });

  function mockData(wallets: string[], found = true) {
    vi.mocked(hasuraRequest).mockImplementation(async (query: string) => {
      if (query.includes('EscrowForAuthz')) return { escrows: found ? [escrow] : [] } as never;
      if (query.includes('CallerWallets')) return { user_wallets: wallets.map((w) => ({ wallet_address: w })) } as never;
      throw new Error(`unexpected query: ${query}`);
    });
  }

  it('returns the signer for the role holder', async () => {
    mockData([GUEST]);
    await expect(authorizeEscrowAction('uid-guest', 'eng-1', 'release_funds')).resolves.toMatchObject({ signer: GUEST });
  });

  it('host trying release_funds → 403', async () => {
    mockData([HOST]);
    await expect(authorizeEscrowAction('uid-host', 'eng-1', 'release_funds')).rejects.toMatchObject({ status: 403 });
  });

  it('unknown escrow → 404', async () => {
    mockData([GUEST], false);
    await expect(authorizeEscrowAction('uid-guest', 'nope', 'fund')).rejects.toMatchObject({ status: 404 });
  });

  it('participant check rejects strangers', async () => {
    mockData([STRANGER]);
    await expect(assertEscrowParticipant('uid-x', 'eng-1')).rejects.toMatchObject({ status: 403 });
    mockData([HOST]);
    await expect(assertEscrowParticipant('uid-host', 'eng-1')).resolves.toMatchObject({ engagement_id: 'eng-1' });
  });
});
