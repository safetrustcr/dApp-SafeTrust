const { createHash } = require('node:crypto');
const { getAuth } = require('firebase-admin/auth');
const { Keypair, Networks, WebAuth } = require('@stellar/stellar-sdk');
const {
  createSep10Challenge,
  getSep10Config,
  verifySep10Challenge,
} = require('../services/sep10-auth');

function firebaseUidForWallet(address) {
  const digest = createHash('sha256').update(address).digest('hex');
  return `stellar_${digest}`;
}

function getHorizonUrl(network, configuredUrl) {
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  return network === Networks.PUBLIC
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}

async function createWalletChallengeHandler(req, res) {
  const { address } = req.body || {};
  if (typeof address !== 'string' || address.length > 56) {
    return res.status(400).json({ error: 'A valid Stellar address is required' });
  }

  let config;
  try {
    config = getSep10Config();
  } catch (error) {
    console.error('[auth/wallet/challenge] SEP-10 configuration error:', error.message);
    return res.status(500).json({ error: 'Wallet authentication is not configured' });
  }

  try {
    const transaction = createSep10Challenge(address, config);
    return res.status(200).json({
      transaction,
      networkPassphrase: config.networkPassphrase,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return res.status(400).json({ error: 'A valid Stellar address is required' });
    }
    console.error('[auth/wallet/challenge] Failed to build challenge:', error.message);
    return res.status(500).json({ error: 'Unable to create wallet challenge' });
  }
}

async function verifyWalletChallengeHandler(req, res) {
  const { signedTransaction } = req.body || {};
  if (typeof signedTransaction !== 'string' || signedTransaction.length === 0 || signedTransaction.length > 10000) {
    return res.status(400).json({ error: 'A signed challenge transaction is required' });
  }

  let config;
  try {
    config = getSep10Config();
  } catch (error) {
    console.error('[auth/wallet/verify] SEP-10 configuration error:', error.message);
    return res.status(500).json({ error: 'Wallet authentication is not configured' });
  }

  let challenge;
  try {
    challenge = WebAuth.readChallengeTx(
      signedTransaction,
      config.serverKeypair.publicKey(),
      config.networkPassphrase,
      config.homeDomain,
      config.webAuthDomain,
    );
  } catch {
    return res.status(401).json({ error: 'Invalid or expired wallet challenge' });
  }

  let accountResponse;
  try {
    const horizonUrl = getHorizonUrl(config.networkPassphrase, config.horizonUrl);
    const response = await fetch(
      `${horizonUrl}/accounts/${encodeURIComponent(challenge.clientAccountID)}`,
    );
    if (response.status === 404) {
      return res.status(401).json({ error: 'Stellar account was not found' });
    }
    if (!response.ok) {
      console.error('[auth/wallet/verify] Horizon returned status:', response.status);
      return res.status(503).json({ error: 'Unable to verify Stellar account' });
    }
    accountResponse = await response.json();
  } catch (error) {
    console.error('[auth/wallet/verify] Horizon request failed:', error.message);
    return res.status(503).json({ error: 'Unable to verify Stellar account' });
  }

  let address;
  try {
    address = verifySep10Challenge(signedTransaction, accountResponse, config);
  } catch {
    return res.status(401).json({ error: 'Wallet signature could not be verified' });
  }

  try {
    const customToken = await getAuth().createCustomToken(firebaseUidForWallet(address), {
      walletAddress: address,
      authProvider: 'stellar',
    });
    return res.status(200).json({ customToken, address });
  } catch (error) {
    console.error('[auth/wallet/verify] Failed to create Firebase custom token:', error.message);
    return res.status(500).json({ error: 'Unable to create wallet session' });
  }
}

module.exports = {
  createWalletChallengeHandler,
  firebaseUidForWallet,
  verifyWalletChallengeHandler,
};
