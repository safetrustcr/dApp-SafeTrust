import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { buildEscrowAction, requireEngagementId } from './build-escrow-action.js';
import { hasuraRequest } from '../../services/hasura.js';
import { getEscrowConversationId } from '../../services/conversation-events.js';

type AuthedRequest = Request & { user?: { uid: string } };

/**
 * POST /api/escrow/dispute  { engagementId, reason?, description? }
 * Either party (guest/approver or host/service provider) may open a dispute.
 * The dispute resolver (platform) may not; the contract forbids it.
 * Only while the escrow is funded or milestone_approved (enforced by the
 * Trustless Work contract and dbDisputeEscrow's conditional update).
 */
export const disputeHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  const engagementId = requireEngagementId(req.body?.engagementId);

  const rawReason = req.body?.reason;
  const reason = typeof rawReason === 'string' && rawReason.trim().length > 0 ? rawReason.trim() : undefined;

  const rawDescription = req.body?.description;
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : undefined;

  if (description && description.length > 500) {
    throw new ApiError(400, 'INVALID_DESCRIPTION', 'description must be 500 characters or less.');
  }

  const result = await buildEscrowAction({
    uid,
    engagementId,
    action: 'dispute',
    request: ({ signer, escrow }) => ({
      path: '/escrow/single-release/dispute-escrow',
      body: { contractId: escrow.contract_id, signer },
      payload: {
        signer,
        ...(reason !== undefined ? { reason } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    }),
  });

  return res.status(200).json(result);
});

/**
 * GET /api/escrow/dispute?engagementId=...&contractId=...
 * Returns the dispute reason and description stored for this escrow.
 */
export const getDisputeHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');

  const engagementId = req.query.engagementId ? String(req.query.engagementId) : undefined;
  const contractId = req.query.contractId ? String(req.query.contractId) : undefined;

  if (!engagementId && !contractId) {
    throw new ApiError(400, 'INVALID_REQUEST', 'engagementId or contractId is required.');
  }

  // 1. Check escrow_pending_actions for dispute payload
  let payloadReason: string | null = null;
  let payloadDesc: string | null = null;
  let disputedAt: string | null = null;
  let pendingContractId: string | null = null;

  try {
    const pendingData = await hasuraRequest<{
      escrow_pending_actions: Array<{
        payload: Record<string, unknown> | null;
        created_at: string;
        contract_id: string | null;
      }>;
    }>(
      `query GetDisputePendingAction($engagementId: String, $contractId: String) {
        escrow_pending_actions(
          where: {
            action: { _eq: "dispute" },
            _or: [
              { engagement_id: { _eq: $engagementId } },
              { contract_id: { _eq: $contractId } }
            ]
          }
          order_by: { created_at: desc }
          limit: 1
        ) {
          payload
          created_at
          contract_id
        }
      }`,
      { engagementId: engagementId ?? null, contractId: contractId ?? null },
    );

    const pending = pendingData?.escrow_pending_actions?.[0];
    if (pending) {
      disputedAt = pending.created_at;
      pendingContractId = pending.contract_id;
      if (typeof pending.payload?.reason === 'string') {
        payloadReason = pending.payload.reason;
      }
      if (typeof pending.payload?.description === 'string') {
        payloadDesc = pending.payload.description;
      }
    }
  } catch {
    // fallback to conversation messages
  }

  // 2. Check conversation messages if effective contractId exists
  const effectiveContractId = contractId ?? pendingContractId;
  let parsedReason: string | null = payloadReason;
  let parsedDesc: string | null = payloadDesc;
  let messageBody: string | null = null;

  if (effectiveContractId) {
    try {
      const convId = await getEscrowConversationId(effectiveContractId);
      if (convId) {
        const msgData = await hasuraRequest<{
          messages: Array<{ body: string; created_at: string }>;
        }>(
          `query GetDisputeMessage($conversationId: uuid!) {
            messages(
              where: {
                conversation_id: { _eq: $conversationId },
                event_type: { _eq: "dispute_opened" }
              }
              order_by: { created_at: desc }
              limit: 1
            ) {
              body
              created_at
            }
          }`,
          { conversationId: convId },
        );
        const msg = msgData?.messages?.[0];
        if (msg) {
          messageBody = msg.body;
          if (!disputedAt) disputedAt = msg.created_at;
          if (!parsedReason) {
            const matchReason = msg.body.match(/Reason:\s*(.+)/);
            if (matchReason) parsedReason = matchReason[1].trim();
          }
          if (!parsedDesc) {
            const matchDesc = msg.body.match(/Description:\s*([\s\S]+)/);
            if (matchDesc) parsedDesc = matchDesc[1].trim();
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return res.status(200).json({
    reason: parsedReason ?? 'Disputed by participant',
    description: parsedDesc ?? '',
    body: messageBody,
    disputedAt,
  });
});
