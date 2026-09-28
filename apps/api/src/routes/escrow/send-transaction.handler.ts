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
  dbMarkMilestoneCompleted,
  dbApproveMilestone,
  dbReleaseFunds,
  dbDisputeEscrow,
  dbResolveDispute,
} from '../../services/escrow-db.js';
import {
  hasuraRequest,
  insertEscrowRecord,
  updateEscrowStatus,
  isEscrowTransitionError,
  isEscrowChangedError,
  HasuraRequestError,
} from '../../services/hasura.js';
import { confirmTransactionWithRetry } from '../../services/stellar-confirm.js';
import { ConcurrentTransitionError } from '../../domain/escrow-state.js';

type EscrowAction =
  | 'initialize'
  | 'fund'
  | 'mark_milestone_completed'
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
  'mark_milestone_completed',
  'approve_milestone',
  'release_funds',
  'dispute',
  'resolve_dispute',
];

const REQUIRED_FIELDS: Record<EscrowAction, (keyof SendTransactionBody)[]> = {
  initialize: ['engagementId', 'senderAddress', 'receiverAddress', 'amount'],
  fund: ['amount'],
  mark_milestone_completed: ['milestoneId'],
  approve_milestone: ['milestoneId', 'approver'],
  release_funds: ['releaseSigner'],
  dispute: [],
  resolve_dispute: [],
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseTransitionError = (error: unknown): { from?: string; to?: string } => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const match = message.match(/invalid\s+escrow\s+transition\s+([^\s]+)\s*->\s*([^\s]+)/i);
  if (match) {
    return { from: match[1], to: match[2] };
  }

  const details = error instanceof HasuraRequestError ? error.details ?? [] : [];
  const detailMessage = details.find((detail) => detail.message.toLowerCase().includes('invalid escrow transition'))?.message ?? '';
  const detailMatch = detailMessage.match(/invalid\s+escrow\s+transition\s+([^\s]+)\s*->\s*([^\s]+)/i);
  if (detailMatch) {
    return { from: detailMatch[1], to: detailMatch[2] };
  }

  return {};
};

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

      const txHash = extractTransactionHash(twResult);
      if (txHash) {
        const ledgerConfirmation = await confirmTransactionWithRetry(txHash, { maxAttempts: 5, intervalMs: 2000 });
        if (ledgerConfirmation === 'failed') {
          return res.status(202).json({
            status: 'confirming',
            message: 'Stellar rejected the submitted transaction, so no escrow status change was applied.',
            contractId,
            transactionHash: txHash,
            ledgerStatus: 'failed',
          });
        }

        if (ledgerConfirmation !== 'success') {
          return res.status(202).json({
            status: 'confirming',
            message: 'Transaction accepted by Trustless Work; waiting for Stellar confirmation.',
            contractId,
            transactionHash: txHash,
            ledgerStatus: 'unknown',
          });
        }
      }

      const updateResult = await updateEscrowStatus(engagementId, resolvedStatus);
      if (updateResult.update_escrows.affected_rows === 0) {
        return res.status(409).json({
          error: 'Escrow changed. Refresh and retry',
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

    const txHash = extractTransactionHash(result);
    if (txHash) {
      const ledgerConfirmation = await confirmTransactionWithRetry(txHash, { maxAttempts: 5, intervalMs: 2000 });

      if (ledgerConfirmation === 'failed') {
        return res.status(202).json({
          status: 'confirming',
          message: 'Stellar rejected the submitted transaction, so no escrow status change was applied.',
          contractId,
          transactionHash: txHash,
          ledgerStatus: 'failed',
        });
      }

      if (ledgerConfirmation !== 'success') {
        return res.status(202).json({
          status: 'confirming',
          message: 'Transaction accepted by Trustless Work; waiting for Stellar confirmation.',
          contractId,
          transactionHash: txHash,
          ledgerStatus: 'unknown',
        });
      }
    }

    const resolvedContractId = (result.contractId as string | undefined) ?? contractId;
    let insertedId: string | undefined;

    try {
      switch (action) {
        case 'initialize': {
          const effectiveReleaser = releaser || process.env.PLATFORM_STELLAR_ADDRESS || senderAddress!;
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
              status: 'created',
            });
            insertedId = record.insert_escrows_one.id;
          }
          break;
        }
        case 'fund': {
          const txHash = extractTransactionHash(result) ?? undefined;
          await dbFundEscrow(resolvedContractId, amount!, engagementId, txHash);
          break;
        }
        case 'mark_milestone_completed': {
          const txHash = extractTransactionHash(result) ?? undefined;
          await dbMarkMilestoneCompleted(resolvedContractId, milestoneId!, engagementId, txHash);
          break;
        }
        case 'approve_milestone': {
          const txHash = extractTransactionHash(result) ?? undefined;
          await dbApproveMilestone(resolvedContractId, milestoneId!, approver!, engagementId, txHash);
          break;
        }
        case 'release_funds': {
          const txHash = extractTransactionHash(result) ?? undefined;
          await dbReleaseFunds(resolvedContractId, releaseSigner!, engagementId, txHash);
          break;
        }
        case 'dispute': {
          const txHash = extractTransactionHash(result) ?? undefined;
          await dbDisputeEscrow(resolvedContractId, engagementId, txHash);
          break;
        }
        case 'resolve_dispute': {
          const txHash = extractTransactionHash(result) ?? undefined;
          await dbResolveDispute(resolvedContractId, engagementId, txHash);
          break;
        }
      }
    } catch (error) {
      if (isEscrowTransitionError(error)) {
        const { from, to } = parseTransitionError(error);
        return res.status(409).json({
          error: `invalid escrow transition ${from ?? 'unknown'} -> ${to ?? 'unknown'}`,
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        });
      }

      if (isEscrowChangedError(error)) {
        return res.status(409).json({
          error: 'Escrow changed. Refresh and retry',
        });
      }

      if (error instanceof ConcurrentTransitionError) {
        return res.status(409).json({
          error: error.message,
          from: error.from,
          to: error.to,
        });
      }

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
