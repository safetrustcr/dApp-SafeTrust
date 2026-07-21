import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';
import { getEscrowAmountByContractId } from '@/lib/server/hasura';

type ResolveDisputeRequestBody = {
  contractId?: string;
  approverFunds?: number;
  receiverFunds?: number;
  releaseSigner?: string;
};

type ResolveDisputeResponse = {
  status: 'SUCCESS' | 'FAILED';
  unsignedTransaction?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResolveDisputeRequestBody;
    const { contractId, approverFunds, receiverFunds, releaseSigner } = body;

    if (!contractId || !releaseSigner) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, releaseSigner.' },
        { status: 400 },
      );
    }

    if (
      typeof approverFunds !== 'number' ||
      !Number.isFinite(approverFunds) ||
      approverFunds < 0 ||
      typeof receiverFunds !== 'number' ||
      !Number.isFinite(receiverFunds) ||
      receiverFunds < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid approverFunds/receiverFunds: must be non-negative numbers.' },
        { status: 400 },
      );
    }

    const escrowAmount = await getEscrowAmountByContractId(contractId);
    if (escrowAmount === null) {
      return NextResponse.json(
        { error: `No escrow record found for contractId: ${contractId}` },
        { status: 404 },
      );
    }

    if (approverFunds + receiverFunds !== escrowAmount) {
      return NextResponse.json(
        {
          error: `approverFunds + receiverFunds (${approverFunds + receiverFunds}) must equal the escrow amount (${escrowAmount}).`,
        },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<ResolveDisputeResponse>(
      '/escrow/single-release/resolve-dispute',
      {
        method: 'POST',
        body: { contractId, approverFunds, receiverFunds, releaseSigner },
      },
    );

    if (result.status !== 'SUCCESS' || !result.unsignedTransaction) {
      return NextResponse.json(
        { error: result.message ?? 'TrustlessWork resolve-dispute failed.', payload: result },
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
      { error: getErrorMessages(error, 'Failed to resolve dispute.') },
      { status: 500 },
    );
  }
}
