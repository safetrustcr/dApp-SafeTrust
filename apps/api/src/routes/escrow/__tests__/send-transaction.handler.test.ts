import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

vi.mock('../../../services/pending-actions.js', () => ({
  getPendingActionByHash: vi.fn(),
  claimForSubmission: vi.fn(),
  releaseClaim: vi.fn(),
  isExpired: (row: { expires_at: string }) => new Date(row.expires_at).getTime() <= Date.now(),
}));
vi.mock('../../../services/trustlesswork.js', () => ({ trustlessWorkRequest: vi.fn() }));
vi.mock('../submitted-effects.js', () => ({ applySubmittedAction: vi.fn() }));

import { claimForSubmission, getPendingActionByHash, releaseClaim } from '../../../services/pending-actions.js';
import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { applySubmittedAction } from '../submitted-effects.js';
import { sendTransactionHandler } from '../send-transaction.handler.js';
import { transactionHash } from '../../../lib/stellar-xdr.js';

const signer = Keypair.random();

function makeTx() {
  const account = new Account(signer.publicKey(), '1');
  return new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '1' }))
    .setTimeout(300)
    .build();
}

function signedFixture() {
  const tx = makeTx();
  const unsignedXdr = tx.toXDR();
  tx.sign(signer);
  return { unsignedXdr, signedXdr: tx.toXDR(), txHash: transactionHash(unsignedXdr) };
}

function pendingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pa-1',
    engagement_id: 'eng-1',
    contract_id: 'CCONTRACT',
    action: 'release_funds',
    tx_hash: 'set-per-test',
    unsigned_xdr: 'x',
    built_for_uid: 'uid-guest',
    signer_address: signer.publicKey(),
    payload: { releaseSigner: signer.publicKey() },
    status: 'built',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    submitted_at: null,
    confirmed_at: null,
    ...overrides,
  };
}

function mockRes() {
  const res: { statusCode?: number; body?: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res } = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

async function call(body: unknown, uid: string | null = 'uid-guest') {
  const req = { body, user: uid ? { uid } : undefined } as never;
  const res = mockRes();
  const next = vi.fn();
  await sendTransactionHandler(req, res as never, next);
  // asyncHandler forwards errors via next(); give the promise chain a tick
  await new Promise((r) => setImmediate(r));
  return { res, next, error: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined };
}

describe('POST /api/escrow/send-transaction', () => {
  beforeEach(() => {
    vi.mocked(getPendingActionByHash).mockReset();
    vi.mocked(claimForSubmission).mockReset();
    vi.mocked(releaseClaim).mockReset();
    vi.mocked(trustlessWorkRequest).mockReset();
    vi.mocked(applySubmittedAction).mockReset();
  });

  it('400 without signedXdr', async () => {
    const { error } = await call({});
    expect(error?.status).toBe(400);
  });

  it('400 for an unparseable XDR', async () => {
    const { error } = await call({ signedXdr: 'garbage' });
    expect(error).toMatchObject({ status: 400, code: 'INVALID_XDR' });
  });

  it('404 for a transaction apps/api never built', async () => {
    const { signedXdr } = signedFixture();
    vi.mocked(getPendingActionByHash).mockResolvedValue(null);
    const { error } = await call({ signedXdr });
    expect(error?.status).toBe(404);
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });

  it('403 for a transaction built for another user', async () => {
    const { signedXdr, txHash } = signedFixture();
    vi.mocked(getPendingActionByHash).mockResolvedValue(pendingRow({ tx_hash: txHash, built_for_uid: 'uid-host' }) as never);
    const { error } = await call({ signedXdr });
    expect(error?.status).toBe(403);
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });

  it('410 for an expired transaction', async () => {
    const { signedXdr, txHash } = signedFixture();
    vi.mocked(getPendingActionByHash).mockResolvedValue(
      pendingRow({ tx_hash: txHash, expires_at: new Date(Date.now() - 1000).toISOString() }) as never,
    );
    const { error } = await call({ signedXdr });
    expect(error?.status).toBe(410);
  });

  it('400 when the envelope is not signed by the role wallet', async () => {
    const tx = makeTx();
    const unsignedXdr = tx.toXDR();
    tx.sign(Keypair.random()); // wrong signer
    vi.mocked(getPendingActionByHash).mockResolvedValue(pendingRow({ tx_hash: transactionHash(unsignedXdr) }) as never);
    const { error } = await call({ signedXdr: tx.toXDR() });
    expect(error).toMatchObject({ status: 400, code: 'MISSING_SIGNATURE' });
  });

  it('ignores client-declared action/status: effects use the server row', async () => {
    const { signedXdr, txHash } = signedFixture();
    const row = pendingRow({ tx_hash: txHash, action: 'fund', payload: { amount: 950 } });
    vi.mocked(getPendingActionByHash).mockResolvedValue(row as never);
    vi.mocked(claimForSubmission).mockResolvedValue(true);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({ status: 'SUCCESS' });

    const { res, error } = await call({ signedXdr, action: 'release_funds', status: 'completed', amount: 1 });

    expect(error).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ action: 'fund', status: 'submitted', txHash });
    expect(applySubmittedAction).toHaveBeenCalledWith(row, expect.objectContaining({ txHash }));
    expect(trustlessWorkRequest).toHaveBeenCalledWith('/helper/send-transaction', {
      method: 'POST',
      body: { signedXdr },
    });
  });

  it('second submit of the same XDR replays without calling Trustless Work again', async () => {
    const { signedXdr, txHash } = signedFixture();
    vi.mocked(getPendingActionByHash)
      .mockResolvedValueOnce(pendingRow({ tx_hash: txHash }) as never)
      .mockResolvedValueOnce(pendingRow({ tx_hash: txHash, status: 'submitted' }) as never);
    vi.mocked(claimForSubmission).mockResolvedValue(true);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({ status: 'SUCCESS' });

    const first = await call({ signedXdr });
    const second = await call({ signedXdr });

    expect(first.res.statusCode).toBe(200);
    expect(second.res.statusCode).toBe(200);
    expect(second.res.body).toMatchObject({ replay: true, status: 'submitted' });
    expect(trustlessWorkRequest).toHaveBeenCalledTimes(1);
  });

  it('a concurrent duplicate that loses the claim does not call Trustless Work', async () => {
    const { signedXdr, txHash } = signedFixture();
    vi.mocked(getPendingActionByHash).mockResolvedValue(pendingRow({ tx_hash: txHash }) as never);
    vi.mocked(claimForSubmission).mockResolvedValue(false);
    const { res } = await call({ signedXdr });
    expect(res.statusCode).toBe(200);
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });

  it('releases the claim when Trustless Work rejects, so the user can retry', async () => {
    const { signedXdr, txHash } = signedFixture();
    vi.mocked(getPendingActionByHash).mockResolvedValue(pendingRow({ tx_hash: txHash }) as never);
    vi.mocked(claimForSubmission).mockResolvedValue(true);
    vi.mocked(trustlessWorkRequest).mockRejectedValue(new Error('TW down'));

    const { error } = await call({ signedXdr });
    expect(error).toBeInstanceOf(Error);
    expect(releaseClaim).toHaveBeenCalledWith('pa-1');
    expect(applySubmittedAction).not.toHaveBeenCalled();
  });

  it('401 without an authenticated user', async () => {
    const { error } = await call({ signedXdr: 'x' }, null);
    expect(error?.status).toBe(401);
  });
});
