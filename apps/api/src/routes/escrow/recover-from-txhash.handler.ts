import { Request, Response } from 'express';
import { trustlessWorkRequest, TrustlessWorkRequestError, getErrorMessages } from '../../services/trustlesswork.js';
import { updateEscrowStatusByContractId } from '../../services/hasura.js';

type RecoverAction =
  | 'initialize'
  | 'fund'
  | 'approve_milestone'
  | 'release_funds'
  | 'dispute'
  | 'resolve_dispute';

type RecoverRequestBody = {
  txHash?: string;
  action?: RecoverAction;
  contractId?: string;
  engagementId?: string;
  apartmentId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  releaser?: string;
  amount?: number;
  milestoneId?: string;
  approver?: string;
  releaseSigner?: string;
};

const VALID_ACTIONS: RecoverAction[] = [
  'initialize',
  'fund',
  'approve_milestone',
  'release_funds',
  'dispute',
  'resolve_dispute',
];

const ACTION_STATUS: Record<RecoverAction, string> = {
  initialize: 'pending_signature',
  fund: 'funded',
  approve_milestone: 'funded',
  release_funds: 'completed',
  dispute: 'disputed',
  resolve_dispute: 'resolved',
};

const REQUIRED_FIELDS: Record<RecoverAction, (keyof RecoverRequestBody)[]> = {
  initialize: ['engagementId', 'apartmentId', 'senderAddress', 'receiverAddress', 'releaser', 'amount'],
  fund: ['amount'],
  approve_milestone: ['milestoneId', 'approver'],
  release_funds: ['releaseSigner'],
  dispute: [],
  resolve_dispute: [],
};

type RecoverResponse = {
  recovered: boolean;
  action: RecoverAction;
  contractId: string;
  txHash: string;
  status: string;
};

export const recoverFromTxhashHandler = async (
  req: Request<{}, RecoverResponse | { error: string; messages?: string[]; payload?: unknown }, RecoverRequestBody>,
  res: Response<RecoverResponse | { error: string; messages?: string[]; payload?: unknown }>
): Promise<Response> => {
  try {
    const { txHash, action, contractId } = req.body || {};

    if (!txHash) {
      return res.status(400).json({ error: 'Missing required field: txHash' });
    }
    if (!action) {
      return res.status(400).json({ error: 'Missing required field: action' });
    }
    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }
    if (!contractId) {
      return res.status(400).json({ error: 'Missing required field: contractId' });
    }

    const missing = REQUIRED_FIELDS[action].filter((field) => {
      const value = req.body[field];
      if (value == null) return true;
      if (field === 'amount') return typeof value !== 'number' || !Number.isFinite(value) || value <= 0;
      return typeof value !== 'string' || value.trim().length === 0;
    });
    if (missing.length > 0) {
      return res.status(400).json({
        error: `${action} action requires: contractId, ${missing.join(', ')}`,
      });
    }

    try {
      await trustlessWorkRequest('/indexer/update-from-txHash', {
        method: 'POST',
        body: { txHash },
      });
    } catch (error) {
      console.error('[recover-from-txhash] TW indexer call failed:', error);
      if (error instanceof TrustlessWorkRequestError) {
        return res.status(error.statusCode).json({
          error: error.message,
          messages: error.messages,
          payload: error.payload,
        });
      }
      const messages = getErrorMessages(error, 'Failed to verify transaction with the indexer.');
      return res.status(502).json({ error: messages[0], messages });
    }

    const status = ACTION_STATUS[action];
    const result = await updateEscrowStatusByContractId(contractId, status);

    if (result.update_escrows.affected_rows === 0) {
      return res.status(404).json({
        error: `No escrow record found for contractId: ${contractId}`,
      });
    }

    return res.status(200).json({ recovered: true, action, contractId, txHash, status });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({
        error: error.message,
        messages: error.messages,
        payload: error.payload,
      });
    }

    return res.status(500).json({
      error: getErrorMessages(error, 'Recovery DB update failed.')[0],
    });
  }
};
