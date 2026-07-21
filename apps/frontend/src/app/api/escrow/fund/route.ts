import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';

type FundEscrowRequestBody = {
  contractId?: string;
  signer?: string;
  amount?: number;
};

type FundEscrowResponse = {
  status: 'SUCCESS' | 'FAILED';
  unsignedTransaction?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FundEscrowRequestBody;
    const { contractId, signer, amount } = body;

    if (!contractId || !signer) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, signer.' },
        { status: 400 },
      );
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number.' },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<FundEscrowResponse>(
      '/escrow/single-release/fund-escrow',
      {
        method: 'POST',
        body: { contractId, signer, amount },
      },
    );

    if (result.status !== 'SUCCESS' || !result.unsignedTransaction) {
      return NextResponse.json(
        { error: result.message ?? 'TrustlessWork fund-escrow failed.', payload: result },
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
      { error: getErrorMessages(error, 'Failed to fund escrow.') },
      { status: 500 },
    );
  }
}
