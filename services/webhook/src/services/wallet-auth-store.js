const { TransactionBuilder, Networks } = require('@stellar/stellar-sdk');

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challengeStore = new Map();

const NETWORK = process.env.STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

function hashOf(xdr) {
  const tx = TransactionBuilder.fromXDR(xdr, NETWORK);
  return tx.hash().toString('hex');
}

async function rememberChallenge(xdr, ttlSeconds = 300) {
  const key = hashOf(xdr);
  challengeStore.set(key, {
    expiresAt: Date.now() + (ttlSeconds || CHALLENGE_TTL_MS / 1000) * 1000,
  });
  return true;
}

async function consumeChallenge(xdr) {
  const key = hashOf(xdr);
  const entry = challengeStore.get(key);

  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    challengeStore.delete(key);
    return false;
  }

  challengeStore.delete(key);
  return true;
}

module.exports = {
  hashOf,
  rememberChallenge,
  consumeChallenge,
  challengeStore,
};
