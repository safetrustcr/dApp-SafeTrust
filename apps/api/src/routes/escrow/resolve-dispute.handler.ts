import type { Request, Response } from 'express';
import { TrustlessWorkRequestError, getErrorMessages, trustlessWorkRequest } from '../../services/trustlesswork.js';

type ResolveDisputeBody = {
  contractId?: string;
  engagementId?: string;
  disputeResolver?: string;
  distributions?: Array<{ address: string; amount: number }>;
};

export async function resolveDisputeHandler(
  req: Request<{}, unknown, ResolveDisputeBody>,
  res: Response,
): Promise<Response> {
  try {
    const { contractId, engagementId, disputeResolver, distributions } = req.body ?? {};
    if (!contractId || !engagementId || !disputeResolver || !Array.isArray(distributions) || distributions.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: contractId, engagementId, disputeResolver, distributions.' });
    }
    if (distributions.some(({ address, amount }) => !address || !Number.isFinite(amount) || amount <= 0)) {
      return res.status(400).json({ error: 'Every distribution needs a recipient address and a positive amount.' });
    }

    const result = await trustlessWorkRequest<{ unsignedXdr?: string; unsignedTransaction?: string; txHash?: string }>(
      '/escrow/single-release/resolve-dispute',
      { method: 'POST', body: { contractId, disputeResolver, distributions } },
    );
    const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;
    if (!unsignedXdr) return res.status(502).json({ error: 'Trustless Work returned no unsigned transaction.', payload: result });
    return res.status(200).json({ unsignedXdr, txHash: result.txHash ?? '', contractId, engagementId });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({ error: error.message, messages: error.messages, payload: error.payload });
    }
    return res.status(500).json({ error: getErrorMessages(error, 'Failed to build dispute-resolution transaction.')[0] });
  }
}
