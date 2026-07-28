import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';

type ReleaseFundsRequestBody = {
  contractId?: string;
  releaseSigner?: string;
};

type ReleaseFundsResponse = {
  status: 'SUCCESS' | 'FAILED';
  unsignedTransaction?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReleaseFundsRequestBody;
    const { contractId, releaseSigner } = body;

    if (!contractId || !releaseSigner) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, releaseSigner.' },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<ReleaseFundsResponse>(
      '/escrow/single-release/release-funds',
      {
        method: 'POST',
        body: { contractId, releaseSigner },
      },
    );

    if (result.status !== 'SUCCESS' || !result.unsignedTransaction) {
      return NextResponse.json(
        { error: result.message ?? 'TrustlessWork release-funds failed.', payload: result },
        { status: 502 },
      );
    }

    return NextResponse.json({
      status: result.status,
      unsignedXDR: result.unsignedTransaction,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        { error: error.message, messages: error.messages, payload: error.payload },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: getErrorMessages(error, 'Failed to release funds.') },
      { status: 500 },
    );
  }
}
