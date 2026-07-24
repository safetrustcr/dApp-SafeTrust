import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';
import { updateEscrowStatus } from '@/lib/server/hasura';

type FundRequestBody = {
  contractId?: string;
  signer?: string;
  amount?: number;
  engagementId?: string;
};

type FundEscrowResponse = {
  unsignedXdr: string;
  txHash: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FundRequestBody;
    const { contractId, signer, amount, engagementId } = body;

    if (!contractId || !signer || typeof amount !== 'number' || !engagementId) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, signer, amount, engagementId.' },
        { status: 400 },
      );
    }

    if (amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number.' },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<FundEscrowResponse>(
      '/escrow/single-release/v2/fund',
      {
        method: 'POST',
        body: { contractId, signer, amount },
      },
    );

    return NextResponse.json({
      unsignedXdr: result.unsignedXdr,
      txHash: result.txHash,
      contractId,
      engagementId,
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        { error: error.message, messages: error.messages, payload: error.payload },
        { status: error.statusCode },
      );
    }

    const messages = getErrorMessages(error, 'Failed to build fund transaction.');
    return NextResponse.json(
      { error: messages[0], messages },
      { status: 500 },
    );
  }
}
