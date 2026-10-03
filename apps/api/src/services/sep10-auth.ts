import { Keypair, Networks, WebAuth } from '@stellar/stellar-sdk';

const NETWORKS: Record<string, string> = {
  TESTNET: Networks.TESTNET,
  PUBLIC: Networks.PUBLIC,
};

export interface Sep10Config {
  serverKeypair: Keypair;
  homeDomain: string;
  webAuthDomain: string;
  networkPassphrase: string;
  horizonUrl: string;
}

export interface HorizonAccount {
  account_id: string;
  thresholds: { low_threshold: number };
  signers: Array<{ key: string; weight: number; type: string }>;
}

export function getSep10Config(env: NodeJS.ProcessEnv = process.env): Sep10Config {
  const secret = env.SEP10_SIGNING_SEED;
  const homeDomain = env.SEP10_HOME_DOMAIN;
  const webAuthDomain = env.SEP10_WEB_AUTH_DOMAIN;
  const networkName = env.STELLAR_NETWORK || 'TESTNET';
  const networkPassphrase = NETWORKS[networkName];

  if (!secret || !homeDomain || !webAuthDomain || !networkPassphrase) {
    throw new Error('SEP-10 requires a signing seed, home domain, web auth domain, and valid network');
  }

  let serverKeypair: Keypair;
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
    horizonUrl: (env.STELLAR_HORIZON_URL || (
      networkPassphrase === Networks.PUBLIC
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org'
    )).replace(/\/+$/, ''),
  };
}

export function createSep10Challenge(address: string, config: Sep10Config): string {
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

export function verifySep10Challenge(
  signedTransaction: string,
  account: HorizonAccount,
  config: Sep10Config,
): string {
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

  WebAuth.verifyChallengeTxThreshold(
    signedTransaction,
    config.serverKeypair.publicKey(),
    config.networkPassphrase,
    account.thresholds.low_threshold,
    account.signers,
    config.homeDomain,
    config.webAuthDomain,
  );

  return clientAccountID;
}
