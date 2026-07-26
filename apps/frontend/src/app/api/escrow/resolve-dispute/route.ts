import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';
import { getEscrowAmountByContractId } from '@/lib/server/hasura';

type ResolveDisputeRequestBody = {
  contractId?: string;
  releaseSigner?: string;
  engagementId?: string;
  approverFunds?: number;
  receiverFunds?: number;
};

type ResolveDisputeResponse = {
  unsignedXdr: string;
  txHash: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResolveDisputeRequestBody;
    const { contractId, releaseSigner, engagementId, approverFunds, receiverFunds } = body;

    if (!contractId || !releaseSigner || !engagementId) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, releaseSigner, engagementId.' },
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
      '/escrow/single-release/v2/resolve-dispute',
      {
        method: 'POST',
        body: { contractId, approverFunds, receiverFunds, releaseSigner },
      },
    );

    return NextResponse.json({
      unsignedXdr: result.unsignedXdr,
      txHash: result.txHash,
      contractId,
      engagementId,
      status: 'resolved',
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        { error: error.message, messages: error.messages, payload: error.payload },
        { status: error.statusCode },
      );
    }

    const messages = getErrorMessages(error, 'Failed to build resolve-dispute transaction.');
    return NextResponse.json(
      { error: messages[0], messages },
      { status: 500 },
    );
  }
}
