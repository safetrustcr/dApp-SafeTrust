import { Request, Response } from 'express';
import {
  trustlessWorkRequest,
  extractTransactionHash,
  TrustlessWorkRequestError,
  getErrorMessages,
} from '../../services/trustlesswork.js';
import {
  dbInitializeEscrow,
  dbFundEscrow,
  dbApproveMilestone,
  dbReleaseFunds,
  dbDisputeEscrow,
  dbResolveDispute,
} from '../../services/escrow-db.js';
import { hasuraRequest, insertEscrowRecord, updateEscrowStatus } from '../../services/hasura.js';

type EscrowAction =
  | 'initialize'
  | 'fund'
  | 'approve_milestone'
  | 'release_funds'
  | 'dispute'
  | 'resolve_dispute';

type SendTransactionBody = {
  signedXdr?: string;
  action?: EscrowAction;
  contractId?: string;
  engagementId?: string;
  propertyId?: string;
  apartmentId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  releaser?: string;
  amount?: number;
  milestoneId?: string;
  approver?: string;
  releaseSigner?: string;
  status?: string;
};

type SendTransactionTWResponse = {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  contractId?: string;
  engagementId?: string;
  escrowId?: string;
  transactionHash?: string;
  txHash?: string;
};

const VALID_ACTIONS: EscrowAction[] = [
  'initialize',
  'fund',
  'approve_milestone',
  'release_funds',
  'dispute',
  'resolve_dispute',
];

const REQUIRED_FIELDS: Record<EscrowAction, (keyof SendTransactionBody)[]> = {
  initialize: ['engagementId', 'senderAddress', 'receiverAddress', 'amount'],
  fund: ['amount'],
  approve_milestone: ['milestoneId', 'approver'],
  release_funds: ['releaseSigner'],
  dispute: [],
  resolve_dispute: [],
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const sendTransactionHandler = async (
  req: Request<{}, Record<string, unknown> | { error: string; messages?: string[]; payload?: unknown }, SendTransactionBody>,
  res: Response<Record<string, unknown> | { error: string; messages?: string[]; payload?: unknown }>
): Promise<Response> => {
  try {
    const body = req.body || {};
    const {
      signedXdr,
      action,
      contractId,
      engagementId,
      propertyId,
      apartmentId,
      senderAddress,
      receiverAddress,
      releaser,
      amount,
      milestoneId,
      approver,
      releaseSigner,
      status,
    } = body;

    // Handle legacy calls without explicit action property
    if (!action) {
      if (!signedXdr || !contractId || !engagementId || !senderAddress || !receiverAddress) {
        return res.status(400).json({
          error: 'Missing required fields: signedXdr, contractId, engagementId, senderAddress, receiverAddress.',
        });
      }

      const allowedStatuses = ['funded', 'milestone_approved', 'completed', 'resolved'];
      const resolvedStatus = status ?? 'funded';
      if (!allowedStatuses.includes(resolvedStatus)) {
        return res.status(400).json({
          error: `Invalid status: must be one of ${allowedStatuses.join(', ')}.`,
        });
      }

      const twResult = await trustlessWorkRequest<SendTransactionTWResponse>('/helper/send-transaction', {
        method: 'POST',
        body: { signedXdr },
      });

      if (twResult.contractId && twResult.contractId !== contractId) {
        return res.status(409).json({
          error: 'Transaction result contractId does not match the requested contract.',
        });
      }

      const updateResult = await updateEscrowStatus(engagementId, resolvedStatus);
      if (updateResult.update_escrows.affected_rows === 0) {
        return res.status(404).json({
          error: `No escrow record found for engagementId: ${engagementId}`,
        });
      }

      return res.status(200).json(twResult as Record<string, unknown>);
    }

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }

    if (!isNonEmptyString(signedXdr) || !isNonEmptyString(contractId)) {
      return res.status(400).json({
        error: 'Missing required fields: signedXdr, contractId',
      });
    }

    const propId = propertyId || apartmentId;

    const missing = REQUIRED_FIELDS[action].filter((field) => {
      const value = body[field];
      if (field === 'engagementId' && engagementId) return false;
      return value == null || (field !== 'amount' && !isNonEmptyString(value));
    });

    if (action === 'initialize' && !propId) {
      missing.push('propertyId');
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `${action} action requires: contractId, ${missing.join(', ')}`,
      });
    }

    if (action === 'initialize' || action === 'fund') {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          error: 'Invalid amount: must be a positive number.',
        });
      }
    }

    let result: SendTransactionTWResponse & Record<string, unknown>;
    try {
      result = await trustlessWorkRequest<SendTransactionTWResponse & Record<string, unknown>>(
        '/helper/send-transaction',
        {
          method: 'POST',
          body: { signedXdr },
        },
      );
    } catch (error) {
      if (error instanceof TrustlessWorkRequestError) {
        return res.status(error.statusCode).json({
          error: error.message,
          messages: error.messages,
          payload: error.payload,
        });
      }
      const messages = getErrorMessages(error, 'Failed to submit signed transaction.');
      return res.status(502).json({ error: messages[0], messages });
    }

    if (result.status !== 'SUCCESS') {
      const messages = getErrorMessages(result, 'TrustlessWork send-transaction failed.');
      return res.status(502).json({ error: messages[0], messages, payload: result });
    }

    const resolvedContractId = (result.contractId as string | undefined) ?? contractId;
    let insertedId: string | undefined;

    try {
      switch (action) {
        case 'initialize': {
          const effectiveReleaser = releaser || process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || process.env.PLATFORM_STELLAR_ADDRESS || senderAddress!;
          await dbInitializeEscrow({
            contractId: resolvedContractId,
            engagementId: engagementId!,
            apartmentId: propId!,
            senderAddress: senderAddress!,
            receiverAddress: receiverAddress!,
            releaser: effectiveReleaser,
            amount: amount!,
          });
          const existing = await hasuraRequest<{ escrows: { id: string }[] }>(
            `query FindEscrowByContractId($contractId: String!) {
              escrows(where: { contract_id: { _eq: $contractId } }) { id }
            }`,
            { contractId: resolvedContractId },
          );
          if (existing.escrows.length > 0) {
            insertedId = existing.escrows[0].id;
          } else {
            const record = await insertEscrowRecord({
              contractId: resolvedContractId,
              engagementId: engagementId!,
              propertyId: propId!,
              senderAddress: senderAddress!,
              receiverAddress: receiverAddress!,
              amount: amount!,
              status: 'funded',
            });
            insertedId = record.insert_escrows_one.id;
          }
          break;
        }
        case 'fund':
          await dbFundEscrow(resolvedContractId, amount!);
          break;
        case 'approve_milestone':
          await dbApproveMilestone(resolvedContractId, milestoneId!, approver!);
          break;
        case 'release_funds':
          await dbReleaseFunds(resolvedContractId, releaseSigner!);
          break;
        case 'dispute':
          await dbDisputeEscrow(resolvedContractId);
          break;
        case 'resolve_dispute':
          await dbResolveDispute(resolvedContractId);
          break;
      }
    } catch (error) {
      const message = getErrorMessages(error, 'Database synchronization failed.');
      return res.status(500).json({
        error: 'Transaction confirmed on-chain, but database synchronization failed.',
        transactionHash: extractTransactionHash(result),
        contractId: resolvedContractId,
        detail: message[0],
      });
    }

    const responsePayload: Record<string, unknown> = {
      status: result.status,
      message: result.message,
      contractId: resolvedContractId,
      transactionHash: extractTransactionHash(result),
      engagementId,
    };

    if (action === 'initialize') {
      responsePayload.escrowId = insertedId;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({
        error: error.message,
        messages: error.messages,
        payload: error.payload,
      });
    }

    const messages = getErrorMessages(error, 'Failed to send transaction.');
    return res.status(500).json({
      error: messages[0],
      messages,
    });
  }
};
