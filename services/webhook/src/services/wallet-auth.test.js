const test = require('node:test');
const assert = require('node:assert/strict');
const { Keypair, Networks, TransactionBuilder, WebAuth } = require('@stellar/stellar-sdk');
const { rememberChallenge, consumeChallenge } = require('./wallet-auth-store');
const { generateWalletChallenge, verifyWalletChallenge } = require('../routes/wallet-auth');

const serverKeypair = Keypair.random();
const clientKeypair = Keypair.random();
const HOME_DOMAIN = 'safetrust.app';
const WEB_AUTH_DOMAIN = 'api.safetrust.app';
const NETWORK = Networks.TESTNET;

function buildSignedChallenge(challengeXdr) {
  const tx = TransactionBuilder.fromXDR(challengeXdr, NETWORK);
  tx.sign(clientKeypair);
  return tx.toXDR();
}

test('generateWalletChallenge returns a valid SEP-10 challenge for a valid account', () => {
  const challenge = generateWalletChallenge({
    account: clientKeypair.publicKey(),
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
    timeoutSeconds: 300,
  });

  assert.ok(challenge);
  assert.ok(typeof challenge.transaction === 'string');
  assert.ok(challenge.transaction.length > 100);
  assert.equal(challenge.network_passphrase, NETWORK);
});

test('verifyWalletChallenge accepts a properly signed challenge', async () => {
  const challenge = generateWalletChallenge({
    account: clientKeypair.publicKey(),
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
    timeoutSeconds: 300,
  });

  const signedChallenge = buildSignedChallenge(challenge.transaction);
  await rememberChallenge(challenge.transaction, 300);
  const verified = await verifyWalletChallenge({
    transaction: signedChallenge,
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
  });

  assert.equal(verified.account, clientKeypair.publicKey());
  assert.equal(verified.valid, true);
});

test('verifyWalletChallenge rejects a reused challenge', async () => {
  const challenge = generateWalletChallenge({
    account: clientKeypair.publicKey(),
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
    timeoutSeconds: 300,
  });

  const signedChallenge = buildSignedChallenge(challenge.transaction);
  await rememberChallenge(challenge.transaction, 300);
  const first = await verifyWalletChallenge({
    transaction: signedChallenge,
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
  });
  const second = await verifyWalletChallenge({
    transaction: signedChallenge,
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
  });

  assert.equal(first.valid, true);
  assert.equal(second.valid, false);
  assert.equal(second.reason, 'CHALLENGE_REUSED_OR_EXPIRED');
});

test('verifyWalletChallenge rejects a wrong signer', async () => {
  const wrongKeypair = Keypair.random();
  const challenge = WebAuth.buildChallengeTx(
    serverKeypair,
    wrongKeypair.publicKey(),
    HOME_DOMAIN,
    300,
    NETWORK,
    WEB_AUTH_DOMAIN,
  );

  const result = await verifyWalletChallenge({
    transaction: challenge,
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
    clientPublicKey: clientKeypair.publicKey(),
  });

  assert.equal(result.valid, false);
  assert.equal(result.reason, 'INVALID_CHALLENGE');
});

test('challenge store consumes a challenge once and rejects reuse', async () => {
  const challenge = generateWalletChallenge({
    account: clientKeypair.publicKey(),
    serverKeypair,
    homeDomain: HOME_DOMAIN,
    webAuthDomain: WEB_AUTH_DOMAIN,
    network: NETWORK,
    timeoutSeconds: 300,
  });

  await rememberChallenge(challenge.transaction, 300);
  const first = await consumeChallenge(challenge.transaction);
  const second = await consumeChallenge(challenge.transaction);

  assert.equal(first, true);
  assert.equal(second, false);
});
