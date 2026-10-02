const { Keypair, Networks, WebAuth } = require('@stellar/stellar-sdk');

const NETWORKS = {
  TESTNET: Networks.TESTNET,
  PUBLIC: Networks.PUBLIC,
};

function getSep10Config(env = process.env) {
  const secret = env.SEP10_SIGNING_SEED;
  const homeDomain = env.SEP10_HOME_DOMAIN;
  const webAuthDomain = env.SEP10_WEB_AUTH_DOMAIN;
  const networkName = env.STELLAR_NETWORK || 'TESTNET';
  const networkPassphrase = NETWORKS[networkName];

  if (!secret || !homeDomain || !webAuthDomain || !networkPassphrase) {
    throw new Error('SEP-10 requires a signing seed, home domain, web auth domain, and valid network');
  }

  let serverKeypair;
  try {
    serverKeypair = Keypair.fromSecret(secret);
  } catch {
    throw new Error('SEP-10 signing seed is invalid');
  }

  return {
    serverKeypair,
    homeDomain,
    webAuthDomain,
    networkPassphrase,
    horizonUrl: env.STELLAR_HORIZON_URL,
  };
}

function createSep10Challenge(address, config) {
  try {
    Keypair.fromPublicKey(address);
  } catch {
    throw new TypeError('Invalid Stellar public key');
  }

  return WebAuth.buildChallengeTx(
    config.serverKeypair,
    address,
    config.homeDomain,
    300,
    config.networkPassphrase,
    config.webAuthDomain,
  );
}

function verifySep10Challenge(signedTransaction, account, config) {
  const { clientAccountID } = WebAuth.readChallengeTx(
    signedTransaction,
    config.serverKeypair.publicKey(),
    config.networkPassphrase,
    config.homeDomain,
    config.webAuthDomain,
  );

  if (account.account_id !== clientAccountID) {
    throw new Error('Horizon account does not match the challenge account');
  }

  const signers = account.signers.map(({ key, weight }) => ({ key, weight }));
  WebAuth.verifyChallengeTxThreshold(
    signedTransaction,
    config.serverKeypair.publicKey(),
    config.networkPassphrase,
    account.thresholds.low_threshold,
    signers,
    config.homeDomain,
    config.webAuthDomain,
  );

  return clientAccountID;
}

module.exports = {
  createSep10Challenge,
  getSep10Config,
  verifySep10Challenge,
};
