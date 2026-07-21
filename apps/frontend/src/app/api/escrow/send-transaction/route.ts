import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';
import { getEscrowStatusByEngagementId, updateEscrowStatus } from '@/lib/server/hasura';

type EscrowAction = 'initialize' | 'fund' | 'milestone-status' | 'release-funds' | 'resolve-dispute';

type SendTransactionRequestBody = {
  signedXdr?: string;
  action?: EscrowAction;
  contractId?: string;
  engagementId?: string;
  propertyId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  amount?: number;
};

type SendTransactionResult = {
  contractId: string;
  engagementId: string;
  escrowId: string;
  status: string;
  transactionHash: string | null;
};

const ACTION_STATUS: Record<EscrowAction, string> = {
  initialize: 'funded',
  fund: 'funded',
  'milestone-status': 'active',
  'release-funds': 'completed',
  'resolve-dispute': 'resolved',
};

const ACTION_FROM_STATUS: Record<EscrowAction, string> = {
  initialize: 'pending_signature',
  fund: 'pending_signature',
  'milestone-status': 'funded',
  'release-funds': 'active',
  'resolve-dispute': 'disputed',
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendTransactionRequestBody;
    const { signedXdr, contractId, engagementId, propertyId, senderAddress, receiverAddress, amount } = body;
    const action = body.action ?? 'initialize';

    if (!signedXdr || !contractId || !engagementId) {
      return NextResponse.json(
        { error: 'Missing required fields: signedXdr, contractId, engagementId.' },
        { status: 400 },
      );
    }

    if (action === 'initialize' && (!senderAddress || !receiverAddress)) {
      return NextResponse.json(
        { error: 'Missing required fields: senderAddress, receiverAddress.' },
        { status: 400 },
      );
    }

    if (!(action in ACTION_STATUS)) {
      return NextResponse.json({ error: `Unsupported action: ${action}.` }, { status: 400 });
    }

    const currentStatus = await getEscrowStatusByEngagementId(engagementId);
    if (currentStatus === null) {
      return NextResponse.json(
        { error: `No escrow record found for engagementId: ${engagementId}` },
        { status: 404 },
      );
    }

    if (currentStatus !== ACTION_FROM_STATUS[action]) {
      return NextResponse.json(
        { error: `Escrow is in status '${currentStatus}', which does not allow the '${action}' action.` },
        { status: 409 },
      );
    }

    const result = await trustlessWorkRequest<SendTransactionResult>('/helper/send-transaction', {
      method: 'POST',
      body: { signedXdr },
    });

    const updateResult = await updateEscrowStatus(engagementId, ACTION_STATUS[action]);
    if (updateResult.update_escrows.affected_rows === 0) {
      return NextResponse.json(
        { error: `No escrow record found for engagementId: ${engagementId}` },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        { error: error.message, messages: error.messages, payload: error.payload },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: getErrorMessages(error, 'Failed to send transaction.') },
      { status: 500 },
    );
  }
}
