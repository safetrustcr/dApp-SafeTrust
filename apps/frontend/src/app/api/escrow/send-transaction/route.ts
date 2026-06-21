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
    const { signedXdr, contractId, engagementId, propertyId, senderAddress, receiverAddress, amount } = body;

    if (!signedXdr || !contractId || !engagementId || !senderAddress || !receiverAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: signedXdr, contractId, engagementId, senderAddress, receiverAddress.' },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<SendTransactionResult>('/helper/send-transaction', {
      method: 'POST',
      body: { signedXdr, contractId, engagementId, propertyId, senderAddress, receiverAddress, amount },
    });

    await updateEscrowStatus(engagementId, 'funded');

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
