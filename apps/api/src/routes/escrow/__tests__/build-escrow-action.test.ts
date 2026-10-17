import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

vi.mock('../../../services/escrow-authz.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/escrow-authz.js')>();
  return { ...actual, authorizeEscrowAction: vi.fn() };
});
vi.mock('../../../services/pending-actions.js', () => ({
  expireStaleActions: vi.fn(),
  findLiveAction: vi.fn(),
  insertPendingAction: vi.fn(),
  isExpired: (row: { expires_at: string }) => new Date(row.expires_at).getTime() <= Date.now(),
}));
vi.mock('../../../services/trustlesswork.js', () => ({ trustlessWorkRequest: vi.fn() }));

import { authorizeEscrowAction, EscrowAccessError } from '../../../services/escrow-authz.js';
import { findLiveAction, insertPendingAction } from '../../../services/pending-actions.js';
import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { buildEscrowAction } from '../build-escrow-action.js';
import { transactionHash } from '../../../lib/stellar-xdr.js';

const GUEST = Keypair.random().publicKey();
const escrow = {
  id: 'e1',
  engagement_id: 'eng-1',
  contract_id: 'CCONTRACT',
  sender_address: GUEST,
  receiver_address: Keypair.random().publicKey(),
  amount: 950,
  status: 'funded',
};

function unsignedXdr() {
  return new TransactionBuilder(new Account(GUEST, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '1' }))
    .setTimeout(300)
    .build()
    .toXDR();
}

const request = vi.fn(({ signer }: { signer: string }) => ({
  path: '/escrow/single-release/release-funds',
  body: { contractId: 'CCONTRACT', releaseSigner: signer },
  payload: { releaseSigner: signer },
}));

beforeEach(() => {
  vi.mocked(authorizeEscrowAction).mockReset();
  vi.mocked(findLiveAction).mockReset();
  vi.mocked(insertPendingAction).mockReset();
  vi.mocked(trustlessWorkRequest).mockReset();
  request.mockClear();
});

describe('buildEscrowAction', () => {
  it('records the built XDR under its hash with server-derived signer and payload', async () => {
    const xdr = unsignedXdr();
    vi.mocked(authorizeEscrowAction).mockResolvedValue({ signer: GUEST, escrow, roles: {} as never });
    vi.mocked(findLiveAction).mockResolvedValue(null);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({ unsignedTransaction: xdr });
    vi.mocked(insertPendingAction).mockImplementation(async (row) => ({
      ...row,
      id: 'pa-1',
      status: 'built',
      created_at: '',
      expires_at: row.expires_at.toISOString(),
      submitted_at: null,
      confirmed_at: null,
    }) as never);

    const result = await buildEscrowAction({ uid: 'uid-guest', engagementId: 'eng-1', action: 'release_funds', request });

    expect(result).toMatchObject({ unsignedXdr: xdr, txHash: transactionHash(xdr), reused: false });
    expect(insertPendingAction).toHaveBeenCalledWith(
      expect.objectContaining({
        tx_hash: transactionHash(xdr),
        built_for_uid: 'uid-guest',
        signer_address: GUEST,
        action: 'release_funds',
        payload: { releaseSigner: GUEST },
      }),
    );
  });

  it('returns the existing unexpired XDR instead of building again', async () => {
    vi.mocked(authorizeEscrowAction).mockResolvedValue({ signer: GUEST, escrow, roles: {} as never });
    vi.mocked(findLiveAction).mockResolvedValue({
      id: 'pa-1',
      engagement_id: 'eng-1',
      contract_id: 'CCONTRACT',
      unsigned_xdr: 'EXISTING',
      tx_hash: 'h',
      built_for_uid: 'uid-guest',
      status: 'built',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    } as never);

    const result = await buildEscrowAction({ uid: 'uid-guest', engagementId: 'eng-1', action: 'release_funds', request });

    expect(result).toMatchObject({ unsignedXdr: 'EXISTING', reused: true });
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });

  it('409 while the same action is submitted and awaiting confirmation', async () => {
    vi.mocked(authorizeEscrowAction).mockResolvedValue({ signer: GUEST, escrow, roles: {} as never });
    vi.mocked(findLiveAction).mockResolvedValue({
      built_for_uid: 'uid-guest',
      status: 'submitted',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    } as never);
    await expect(
      buildEscrowAction({ uid: 'uid-guest', engagementId: 'eng-1', action: 'release_funds', request }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('authorization failure maps to the same HTTP status and never calls Trustless Work', async () => {
    vi.mocked(authorizeEscrowAction).mockRejectedValue(new EscrowAccessError(403, 'WALLET_NOT_AUTHORIZED', 'no'));
    await expect(
      buildEscrowAction({ uid: 'uid-host', engagementId: 'eng-1', action: 'release_funds', request }),
    ).rejects.toMatchObject({ status: 403, code: 'WALLET_NOT_AUTHORIZED' });
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('409 when the escrow has no contract yet', async () => {
    vi.mocked(authorizeEscrowAction).mockResolvedValue({ signer: GUEST, escrow: { ...escrow, contract_id: null }, roles: {} as never });
    await expect(
      buildEscrowAction({ uid: 'uid-guest', engagementId: 'eng-1', action: 'fund', request }),
    ).rejects.toMatchObject({ status: 409, code: 'ESCROW_NOT_DEPLOYED' });
  });

  it('502 retryable when Trustless Work returns no XDR', async () => {
    vi.mocked(authorizeEscrowAction).mockResolvedValue({ signer: GUEST, escrow, roles: {} as never });
    vi.mocked(findLiveAction).mockResolvedValue(null);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({});
    await expect(
      buildEscrowAction({ uid: 'uid-guest', engagementId: 'eng-1', action: 'release_funds', request }),
    ).rejects.toMatchObject({ status: 502 });
    expect(insertPendingAction).not.toHaveBeenCalled();
  });
});
