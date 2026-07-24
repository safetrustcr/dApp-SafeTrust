import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';

type ReleaseRequestBody = {
  contractId?: string;
  releaseSigner?: string;
  engagementId?: string;
};

type ReleaseFundsResponse = {
  unsignedXdr: string;
  txHash: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReleaseRequestBody;
    const { contractId, releaseSigner, engagementId } = body;

    if (!contractId || !releaseSigner || !engagementId) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, releaseSigner, engagementId.' },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<ReleaseFundsResponse>(
      '/escrow/single-release/v2/release-funds',
      {
        method: 'POST',
        body: { contractId, releaseSigner },
      },
    );

    return NextResponse.json({
      unsignedXdr: result.unsignedXdr,
      txHash: result.txHash,
      contractId,
      engagementId,
      status: 'completed',
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        { error: error.message, messages: error.messages, payload: error.payload },
        { status: error.statusCode },
      );
    }

    const messages = getErrorMessages(error, 'Failed to build release transaction.');
    return NextResponse.json(
      { error: messages[0], messages },
      { status: 500 },
    );
  }
}
