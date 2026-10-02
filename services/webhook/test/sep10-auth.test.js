const test = require('node:test');
const assert = require('node:assert/strict');
const { Keypair, Networks, Transaction } = require('@stellar/stellar-sdk');
const {
  createSep10Challenge,
  getSep10Config,
  verifySep10Challenge,
} = require('../src/services/sep10-auth');

function testConfig() {
  return {
    serverKeypair: Keypair.random(),
    homeDomain: 'safetrust.example',
    webAuthDomain: 'auth.safetrust.example',
    networkPassphrase: Networks.TESTNET,
  };
}

function signChallenge(challenge, keypair, config) {
  const transaction = new Transaction(challenge, config.networkPassphrase);
  transaction.sign(keypair);
  return transaction.toXDR();
}

test('SEP-10 challenge verifies the Stellar account signer and threshold', () => {
  const config = testConfig();
  const wallet = Keypair.random();
  const challenge = createSep10Challenge(wallet.publicKey(), config);
  const signedChallenge = signChallenge(challenge, wallet, config);
  const account = {
    account_id: wallet.publicKey(),
    thresholds: { low_threshold: 1 },
    signers: [{ key: wallet.publicKey(), weight: 1 }],
  };

  assert.equal(
    verifySep10Challenge(signedChallenge, account, config),
    wallet.publicKey(),
  );
});

test('SEP-10 challenge rejects a transaction without the wallet signature', () => {
  const config = testConfig();
  const wallet = Keypair.random();
  const challenge = createSep10Challenge(wallet.publicKey(), config);
  const account = {
    account_id: wallet.publicKey(),
    thresholds: { low_threshold: 1 },
    signers: [{ key: wallet.publicKey(), weight: 1 }],
  };

  assert.throws(() => verifySep10Challenge(challenge, account, config));
});

test('SEP-10 challenge rejects a different Horizon account', () => {
  const config = testConfig();
  const wallet = Keypair.random();
  const otherWallet = Keypair.random();
  const challenge = createSep10Challenge(wallet.publicKey(), config);
  const signedChallenge = signChallenge(challenge, wallet, config);
  const account = {
    account_id: otherWallet.publicKey(),
    thresholds: { low_threshold: 1 },
    signers: [{ key: wallet.publicKey(), weight: 1 }],
  };

  assert.throws(
    () => verifySep10Challenge(signedChallenge, account, config),
    /does not match/,
  );
});

test('SEP-10 configuration rejects missing and invalid network settings', () => {
  assert.throws(() => getSep10Config({}), /SEP-10 requires/);
  assert.throws(
    () =>
      getSep10Config({
        SEP10_SIGNING_SEED: Keypair.random().secret(),
        SEP10_HOME_DOMAIN: 'safetrust.example',
        SEP10_WEB_AUTH_DOMAIN: 'auth.safetrust.example',
        STELLAR_NETWORK: 'INVALID',
      }),
    /SEP-10 requires/,
  );
});
