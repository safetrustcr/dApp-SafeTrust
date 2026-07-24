import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';
import { updateEscrowStatus } from '@/lib/server/hasura';

type SendTransactionRequestBody = {
  signedXdr?: string;
  contractId?: string;
  engagementId?: string;
  propertyId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  amount?: number;
  status?: string;
};

type SendTransactionResult = {
  contractId: string;
  engagementId: string;
  escrowId: string;
  status: string;
  transactionHash: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendTransactionRequestBody;
    const { signedXdr, contractId, engagementId, propertyId, senderAddress, receiverAddress, amount, status } = body;

    if (!signedXdr || !contractId || !engagementId || !senderAddress || !receiverAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: signedXdr, contractId, engagementId, senderAddress, receiverAddress.' },
        { status: 400 },
      );
    }

    const allowedStatuses = ['funded', 'milestone_approved', 'completed'];
    const resolvedStatus = status ?? 'funded';
    if (!allowedStatuses.includes(resolvedStatus)) {
      return NextResponse.json(
        { error: `Invalid status: must be one of ${allowedStatuses.join(', ')}.` },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<SendTransactionResult>('/helper/send-transaction', {
      method: 'POST',
      body: { signedXdr },
    });

    if (result.contractId !== contractId || result.engagementId !== engagementId) {
      return NextResponse.json(
        { error: 'Transaction result does not match the requested contract and engagement.' },
        { status: 409 },
      );
    }

    const updateResult = await updateEscrowStatus(engagementId, resolvedStatus);
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

    const messages = getErrorMessages(error, 'Failed to send transaction.');
    return NextResponse.json(
      { error: messages[0], messages },
      { status: 500 },
    );
  }
}
