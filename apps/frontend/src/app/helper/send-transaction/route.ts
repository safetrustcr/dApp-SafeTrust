import { NextRequest, NextResponse } from 'next/server';

import { insertEscrowRecord } from '@/lib/server/hasura';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import {
  extractTransactionHash,
  TrustlessWorkRequestError,
  trustlessWorkRequest,
} from '@/lib/server/trustlesswork';

type SendTransactionBody = {
  signedXdr?: string;
  contractId?: string;
  engagementId?: string;
  propertyId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  amount?: number;
};

type SendTransactionResponse = {
  status: 'SUCCESS' | 'FAILED';
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendTransactionBody;
    const {
      signedXdr,
      contractId,
      engagementId,
      propertyId,
      senderAddress,
      receiverAddress,
      amount,
    } = body;

    if (
      !signedXdr ||
      !contractId ||
      !engagementId ||
      !propertyId ||
      !senderAddress ||
      !receiverAddress
    ) {
      return NextResponse.json(
        { error: 'Missing required signed transaction fields.' },
        { status: 400 },
      );
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number.' },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<SendTransactionResponse & Record<string, unknown>>(
      '/helper/send-transaction',
      {
        method: 'POST',
        body: { signedXdr },
      },
    );

    if (result.status !== 'SUCCESS') {
      const messages = getErrorMessages(result, 'TrustlessWork send-transaction failed.');
      return NextResponse.json({ error: messages[0], messages, payload: result }, { status: 502 });
    }

    const insertResult = await insertEscrowRecord({
      contractId,
      engagementId,
      propertyId,
      senderAddress,
      receiverAddress,
      amount,
      status: 'funded',
    });

    return NextResponse.json({
      status: result.status,
      message: result.message,
      transactionHash: extractTransactionHash(result),
      engagementId,
      contractId,
      escrowId: insertResult.insert_escrows_one.id,
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        {
          error: error.message,
          messages: error.messages,
          payload: error.payload,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: getErrorMessages(error, 'Failed to submit signed transaction.') },
      { status: 500 },
    );
  }
}