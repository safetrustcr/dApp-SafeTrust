const express = require('express');
const { Keypair, Networks, StrKey, WebAuth } = require('@stellar/stellar-sdk');
const admin = require('firebase-admin');
const { consumeChallenge, rememberChallenge } = require('../services/wallet-auth-store');

const router = express.Router();

function resolveWalletAuthConfig(overrides = {}) {
  const serverSecret = process.env.SEP10_SIGNING_SECRET || process.env.STELLAR_SIGNING_SECRET;
  if (!serverSecret && !overrides.serverKeypair) {
    throw new Error('SEP10_SIGNING_SECRET is required');
  }

  const serverKeypair = overrides.serverKeypair || Keypair.fromSecret(serverSecret);
  const network = overrides.network || (process.env.STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET);
  const homeDomain = overrides.homeDomain || process.env.SEP10_HOME_DOMAIN || 'safetrust.app';
  const webAuthDomain = overrides.webAuthDomain || process.env.SEP10_WEB_AUTH_DOMAIN || homeDomain;
  const timeoutSeconds = overrides.timeoutSeconds || Number(process.env.SEP10_TIMEOUT_SECONDS || 300);

  return { serverKeypair, network, homeDomain, webAuthDomain, timeoutSeconds };
}

function generateWalletChallenge({ account, serverKeypair, homeDomain, webAuthDomain, network, timeoutSeconds }) {
  if (!account || !StrKey.isValidEd25519PublicKey(account)) {
    throw new Error('INVALID_ACCOUNT');
  }

  const config = resolveWalletAuthConfig({
    serverKeypair,
    homeDomain,
    webAuthDomain,
    network,
    timeoutSeconds,
  });

  const transaction = WebAuth.buildChallengeTx(
    config.serverKeypair,
    account,
    config.homeDomain,
    config.timeoutSeconds,
    config.network,
    config.webAuthDomain,
  );

  return {
    transaction,
    network_passphrase: config.network,
  };
}

async function verifyWalletChallenge({ transaction, serverKeypair, homeDomain, webAuthDomain, network, clientPublicKey }) {
  if (typeof transaction !== 'string' || !transaction.trim()) {
    return { valid: false, reason: 'INVALID_CHALLENGE' };
  }

  try {
    const config = resolveWalletAuthConfig({ serverKeypair, homeDomain, webAuthDomain, network });
    const { clientAccountID } = WebAuth.readChallengeTx(
      transaction,
      config.serverKeypair.publicKey(),
      config.network,
      config.homeDomain,
      config.webAuthDomain,
    );

    const accountId = clientPublicKey || clientAccountID;

    WebAuth.verifyChallengeTxSigners(
      transaction,
      config.serverKeypair.publicKey(),
      config.network,
      [accountId],
      config.homeDomain,
      config.webAuthDomain,
    );

    if (!(await consumeChallenge(transaction))) {
      return { valid: false, reason: 'CHALLENGE_REUSED_OR_EXPIRED', account: accountId };
    }

    return { valid: true, account: accountId };
  } catch (error) {
    return { valid: false, reason: 'INVALID_CHALLENGE' };
  }
}

const rateLimitMap = new Map();

function walletAuthRateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const bucket = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60_000 };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }

  if (bucket.count >= 20) {
    return res.status(429).json({ error: 'RATE_LIMITED' });
  }

  bucket.count += 1;
  rateLimitMap.set(ip, bucket);
  return next();
}

router.use(walletAuthRateLimit);

router.post('/wallet/challenge', async (req, res) => {
  const { account } = req.body || {};

  try {
    const config = resolveWalletAuthConfig();
    const challenge = generateWalletChallenge({ account, ...config });
    await rememberChallenge(challenge.transaction, config.timeoutSeconds);
    return res.status(200).json(challenge);
  } catch (error) {
    return res.status(400).json({ error: 'INVALID_ACCOUNT' });
  }
});

router.post('/wallet/verify', async (req, res) => {
  const { transaction } = req.body || {};

  try {
    const config = resolveWalletAuthConfig();
    const verification = await verifyWalletChallenge({ transaction, ...config });

    if (!verification.valid) {
      return res.status(401).json({
        error: verification.reason || 'INVALID_CHALLENGE',
        account: verification.account || null,
      });
    }

    const uid = `stellar:${verification.account}`;
    try {
      await admin.auth().getUser(uid);
    } catch (_error) {
      await admin.auth().createUser({ uid, displayName: verification.account });
    }

    const customToken = await admin.auth().createCustomToken(uid, {
      wallet: verification.account,
      auth_method: 'sep10',
    });

    return res.status(200).json({ customToken, account: verification.account });
  } catch (_error) {
    return res.status(401).json({ error: 'INVALID_CHALLENGE' });
  }
});

module.exports = router;
module.exports.generateWalletChallenge = generateWalletChallenge;
module.exports.verifyWalletChallenge = verifyWalletChallenge;
module.exports.resolveWalletAuthConfig = resolveWalletAuthConfig;
