import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { WebAuth } from '@stellar/stellar-sdk';
import {
  createSep10Challenge,
  getSep10Config,
  verifySep10Challenge,
  type HorizonAccount,
} from '../../services/sep10-auth.js';

interface ChallengeRequest {
  address?: unknown;
}

interface VerifyRequest {
  signedTransaction?: unknown;
}

function firebaseUidForWallet(address: string): string {
  const digest = createHash('sha256').update(address).digest('hex');
  return `stellar_${digest}`;
}

export async function createWalletChallengeHandler(
  req: Request<unknown, unknown, ChallengeRequest>,
  res: Response,
): Promise<Response> {
  const { address } = req.body ?? {};
  if (typeof address !== 'string' || address.length > 56) {
    return res.status(400).json({ error: 'A valid Stellar address is required' });
  }

  let config;
  try {
    config = getSep10Config();
  } catch (error) {
    console.error('[auth/wallet/challenge] SEP-10 configuration error:', error);
    return res.status(500).json({ error: 'Wallet authentication is not configured' });
  }

  try {
    return res.status(200).json({
      transaction: createSep10Challenge(address, config),
      networkPassphrase: config.networkPassphrase,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return res.status(400).json({ error: 'A valid Stellar address is required' });
    }
    console.error('[auth/wallet/challenge] Failed to build challenge:', error);
    return res.status(500).json({ error: 'Unable to create wallet challenge' });
  }
}

export async function verifyWalletChallengeHandler(
  req: Request<unknown, unknown, VerifyRequest>,
  res: Response,
): Promise<Response> {
  const { signedTransaction } = req.body ?? {};
  if (
    typeof signedTransaction !== 'string' ||
    signedTransaction.length === 0 ||
    signedTransaction.length > 10000
  ) {
    return res.status(400).json({ error: 'A signed challenge transaction is required' });
  }

  let config;
  try {
    config = getSep10Config();
  } catch (error) {
    console.error('[auth/wallet/verify] SEP-10 configuration error:', error);
    return res.status(500).json({ error: 'Wallet authentication is not configured' });
  }

  let clientAccountID: string;
  try {
    ({ clientAccountID } = WebAuth.readChallengeTx(
      signedTransaction,
      config.serverKeypair.publicKey(),
      config.networkPassphrase,
      config.homeDomain,
      config.webAuthDomain,
    ));
  } catch {
    return res.status(401).json({ error: 'Invalid or expired wallet challenge' });
  }

  let account: HorizonAccount;
  try {
    const response = await fetch(
      `${config.horizonUrl}/accounts/${encodeURIComponent(clientAccountID)}`,
    );
    if (response.status === 404) {
      return res.status(401).json({ error: 'Stellar account was not found' });
    }
    if (!response.ok) {
      console.error('[auth/wallet/verify] Horizon returned status:', response.status);
      return res.status(503).json({ error: 'Unable to verify Stellar account' });
    }
    account = await response.json() as HorizonAccount;
  } catch (error) {
    console.error('[auth/wallet/verify] Horizon request failed:', error);
    return res.status(503).json({ error: 'Unable to verify Stellar account' });
  }

  let address: string;
  try {
    address = verifySep10Challenge(signedTransaction, account, config);
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
    console.error('[auth/wallet/verify] Failed to create Firebase custom token:', error);
    return res.status(500).json({ error: 'Unable to create wallet session' });
  }
}
