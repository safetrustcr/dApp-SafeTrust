import { Request, Response } from 'express';
import { trustlessWorkRequest, TrustlessWorkRequestError, getErrorMessages } from '../../services/trustlesswork.js';

type FundRequestBody = {
  contractId?: string;
  signer?: string;
  amount?: number;
  engagementId?: string;
};

type FundEscrowTWResponse = {
  unsignedXdr: string;
  txHash: string;
};

type FundResponse = {
  unsignedXdr: string;
  txHash: string;
  contractId: string;
  engagementId: string;
};

export const fundEscrowHandler = async (
  req: Request<{}, FundResponse | { error: string; messages?: string[]; payload?: unknown }, FundRequestBody>,
  res: Response<FundResponse | { error: string; messages?: string[]; payload?: unknown }>
): Promise<Response> => {
  try {
    const { contractId, signer, amount, engagementId } = req.body || {};

    if (!contractId || !signer || typeof amount !== 'number' || !engagementId) {
      return res.status(400).json({
        error: 'Missing required fields: contractId, signer, amount, engagementId.',
      });
    }

    if (amount <= 0 || !Number.isFinite(amount)) {
      return res.status(400).json({
        error: 'Invalid amount: must be a positive number.',
      });
    }

    const result = await trustlessWorkRequest<FundEscrowTWResponse>(
      '/escrow/single-release/v2/fund',
      {
        method: 'POST',
        body: { contractId, signer, amount },
      },
    );

    return res.status(200).json({
      unsignedXdr: result.unsignedXdr,
      txHash: result.txHash,
      contractId,
      engagementId,
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({
        error: error.message,
        messages: error.messages,
        payload: error.payload,
      });
    }

    const messages = getErrorMessages(error, 'Failed to build fund transaction.');
    return res.status(500).json({
      error: messages[0],
      messages,
    });
  }
};
