import { describe, expect, it } from 'vitest';
import {
  Account,
  Asset,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import {
  DEFAULT_TTL_MS,
  InvalidXdrError,
  isSignedBy,
  transactionExpiry,
  transactionHash,
} from '../../../src/lib/stellar-xdr.js';

function buildUnsigned(source: Keypair, timeoutSeconds = 300) {
  const account = new Account(source.publicKey(), '100');
  return new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(
      Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '1' }),
    )
    .setTimeout(timeoutSeconds)
    .build();
}

describe('stellar-xdr', () => {
  it('unsigned and signed envelopes share the same hash', () => {
    const signer = Keypair.random();
    const tx = buildUnsigned(signer);
    const unsignedXdr = tx.toXDR();

    tx.sign(signer);
    const signedXdr = tx.toXDR();

    expect(signedXdr).not.toBe(unsignedXdr);
    expect(transactionHash(signedXdr)).toBe(transactionHash(unsignedXdr));
  });

  it('a different transaction has a different hash', () => {
    const signer = Keypair.random();
    expect(transactionHash(buildUnsigned(signer).toXDR())).not.toBe(
      transactionHash(buildUnsigned(Keypair.random()).toXDR()),
    );
  });

  it('isSignedBy detects the expected signer only', () => {
    const signer = Keypair.random();
    const other = Keypair.random();
    const tx = buildUnsigned(signer);

    expect(isSignedBy(tx.toXDR(), signer.publicKey())).toBe(false);
    tx.sign(other);
    expect(isSignedBy(tx.toXDR(), signer.publicKey())).toBe(false);
    tx.sign(signer);
    expect(isSignedBy(tx.toXDR(), signer.publicKey())).toBe(true);
    expect(isSignedBy(tx.toXDR(), 'not-a-key')).toBe(false);
  });

  it('fee-bump envelopes resolve to the inner transaction hash', () => {
    const signer = Keypair.random();
    const inner = buildUnsigned(signer);
    const innerHash = transactionHash(inner.toXDR());
    inner.sign(signer);

    const feeSource = Keypair.random();
    const bump: FeeBumpTransaction = TransactionBuilder.buildFeeBumpTransaction(
      feeSource,
      '200',
      inner,
      Networks.TESTNET,
    );
    bump.sign(feeSource);

    expect(transactionHash(bump.toXDR())).toBe(innerHash);
    expect(isSignedBy(bump.toXDR(), signer.publicKey())).toBe(true);
  });

  it('expiry comes from maxTime, else the default TTL', () => {
    const now = Date.now();
    const timed = buildUnsigned(Keypair.random(), 120);
    const maxTime = Number(timed.timeBounds!.maxTime);
    expect(transactionExpiry(timed.toXDR(), now).getTime()).toBe(maxTime * 1000);

    const untimed = buildUnsigned(Keypair.random(), 0); // setTimeout(0) = no upper bound
    expect(transactionExpiry(untimed.toXDR(), now).getTime()).toBe(now + DEFAULT_TTL_MS);
  });

  it('rejects garbage and wrong-network envelopes', () => {
    expect(() => transactionHash('not-xdr')).toThrow(InvalidXdrError);
    expect(() => transactionHash('')).toThrow(InvalidXdrError);

    const signer = Keypair.random();
    const testnetHash = transactionHash(buildUnsigned(signer).toXDR());
    const xdr = buildUnsigned(signer).toXDR();
    // Same bytes interpreted on another network hash differently — binding is network-specific.
    expect(transactionHash(xdr, Networks.PUBLIC)).not.toBe(testnetHash);
  });
});