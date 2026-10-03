import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import {
  createSep10Challenge,
  getSep10Config,
  verifySep10Challenge,
} from '../sep10-auth.js';

function testConfig() {
  return {
    serverKeypair: Keypair.random(),
    homeDomain: 'safetrust.example',
    webAuthDomain: 'auth.safetrust.example',
    networkPassphrase: Networks.TESTNET,
    horizonUrl: 'https://horizon-testnet.stellar.org',
  };
}

function signChallenge(challenge: string, keypair: Keypair, passphrase: string) {
  const transaction = new Transaction(challenge, passphrase);
  transaction.sign(keypair);
  return transaction.toXDR();
}

describe('SEP-10 wallet authentication', () => {
  it('accepts a challenge signed by the account at its low threshold', () => {
    const config = testConfig();
    const wallet = Keypair.random();
    const challenge = createSep10Challenge(wallet.publicKey(), config);
    const signedChallenge = signChallenge(
      challenge,
      wallet,
      config.networkPassphrase,
    );

    expect(
      verifySep10Challenge(signedChallenge, {
        account_id: wallet.publicKey(),
        thresholds: { low_threshold: 1 },
        signers: [{ key: wallet.publicKey(), weight: 1, type: 'ed25519_public_key' }],
      }, config),
    ).toBe(wallet.publicKey());
  });

  it('rejects an unsigned challenge', () => {
    const config = testConfig();
    const wallet = Keypair.random();
    const challenge = createSep10Challenge(wallet.publicKey(), config);

    expect(() =>
      verifySep10Challenge(challenge, {
        account_id: wallet.publicKey(),
        thresholds: { low_threshold: 1 },
        signers: [{ key: wallet.publicKey(), weight: 1, type: 'ed25519_public_key' }],
      }, config),
    ).toThrow();
  });

  it('rejects a Horizon account that differs from the challenge account', () => {
    const config = testConfig();
    const wallet = Keypair.random();
    const challenge = createSep10Challenge(wallet.publicKey(), config);
    const signedChallenge = signChallenge(
      challenge,
      wallet,
      config.networkPassphrase,
    );

    expect(() =>
      verifySep10Challenge(signedChallenge, {
        account_id: Keypair.random().publicKey(),
        thresholds: { low_threshold: 1 },
        signers: [{ key: wallet.publicKey(), weight: 1, type: 'ed25519_public_key' }],
      }, config),
    ).toThrow(/does not match/);
  });

  it('rejects missing configuration and an invalid network', () => {
    expect(() => getSep10Config({})).toThrow(/SEP-10 requires/);
    expect(() =>
      getSep10Config({
        SEP10_SIGNING_SEED: Keypair.random().secret(),
        SEP10_HOME_DOMAIN: 'safetrust.example',
        SEP10_WEB_AUTH_DOMAIN: 'auth.safetrust.example',
        STELLAR_NETWORK: 'INVALID',
      }),
    ).toThrow(/SEP-10 requires/);
  });
});
