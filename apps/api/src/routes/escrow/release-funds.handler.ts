import { Request, Response } from 'express';
import { trustlessWorkRequest, TrustlessWorkRequestError, getErrorMessages } from '../../services/trustlesswork.js';

type ReleaseRequestBody = {
  contractId?: string;
  releaseSigner?: string;
  engagementId?: string;
};

type ReleaseFundsTWResponse = {
  unsignedXdr?: string;
  unsignedTransaction?: string;
  txHash?: string;
  status?: string;
  message?: string;
};

type ReleaseResponse = {
  unsignedXdr?: string;
  unsignedXDR?: string;
  txHash?: string;
  contractId?: string;
  engagementId?: string;
  status?: string;
  message?: string;
};

export const releaseFundsHandler = async (
  req: Request<{}, ReleaseResponse | { error: string; messages?: string[]; payload?: unknown }, ReleaseRequestBody>,
  res: Response<ReleaseResponse | { error: string; messages?: string[]; payload?: unknown }>
): Promise<Response> => {
  try {
    const { contractId, releaseSigner, engagementId } = req.body || {};

    if (!contractId || !releaseSigner) {
      return res.status(400).json({
        error: 'Missing required fields: contractId, releaseSigner.',
      });
    }

    const result = await trustlessWorkRequest<ReleaseFundsTWResponse>(
      '/escrow/single-release/v2/release-funds',
      {
        method: 'POST',
        body: { contractId, releaseSigner },
      },
    );

    const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;

    return res.status(200).json({
      unsignedXdr: unsignedXdr ?? '',
      unsignedXDR: unsignedXdr ?? '',
      txHash: result.txHash ?? '',
      contractId,
      engagementId: engagementId ?? '',
      status: 'completed',
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({
        error: error.message,
        messages: error.messages,
        payload: error.payload,
      });
    }

    const messages = getErrorMessages(error, 'Failed to build release transaction.');
    return res.status(500).json({
      error: messages[0],
      messages,
    });
  }
};
