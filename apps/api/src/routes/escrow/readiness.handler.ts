import type { Request, Response } from 'express';
import { Horizon } from '@stellar/stellar-sdk';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  checkWalletReadiness,
  buildChangeTrustXdr,
  getHorizonServerUrl,
  getGuestPrimaryWallet,
  type WalletReadinessResponse,
} from '../../services/wallet-readiness.js';
import { getUserWallets } from '../../services/escrow-authz.js';

type ReadinessQuery = {
  apartmentId?: string;
  reservationId?: string;
};

export const getReadinessHandler = asyncHandler(
  async (
    req: AuthenticatedRequest & Request<Record<string, never>, WalletReadinessResponse | { error: string }, Record<string, never>, ReadinessQuery>,
    res: Response<WalletReadinessResponse | { error: string }>,
  ) => {
    const uid = req.user?.uid;
    if (!uid) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
    }

    const { apartmentId, reservationId } = req.query;

    if ((!apartmentId && !reservationId) || (apartmentId && reservationId)) {
      throw new ApiError(
        400,
        'INVALID_QUERY_PARAMS',
        'Provide exactly one apartmentId or reservationId query parameter.',
      );
    }

    const readiness = await checkWalletReadiness({
      uid,
      apartmentId,
      reservationId,
    });

    res.status(200).json(readiness);
  },
);

type BuildTrustlineBody = {
  walletAddress?: string;
};

type BuildTrustlineResponse = {
  unsignedXdr: string;
};

export const buildTrustlineHandler = asyncHandler(
  async (
    req: AuthenticatedRequest & Request<Record<string, never>, BuildTrustlineResponse | { error: string }, BuildTrustlineBody>,
    res: Response<BuildTrustlineResponse | { error: string }>,
  ) => {
    const uid = req.user?.uid;
    if (!uid) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
    }

    const usdcIssuer = process.env.USDC_TRUSTLINE_ADDRESS;
    if (!usdcIssuer) {
      throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is temporarily unavailable.', {
        retryable: true,
      });
    }

    const callerWallets = await getUserWallets(uid);
    let wallet = req.body?.walletAddress;

    if (!wallet) {
      wallet = (await getGuestPrimaryWallet(uid)) ?? callerWallets[0];
    }

    if (!wallet || !callerWallets.includes(wallet)) {
      throw new ApiError(
        403,
        'WALLET_NOT_REGISTERED',
        'Connect and register the Stellar wallet that will sign this escrow.',
      );
    }

    const server = new Horizon.Server(getHorizonServerUrl());
    const unsignedXdr = await buildChangeTrustXdr(server, wallet, usdcIssuer);

    res.status(200).json({ unsignedXdr });
  },
);
