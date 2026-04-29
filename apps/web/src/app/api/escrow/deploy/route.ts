import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';

type DeployRequestBody = {
  apartmentId?: string;
  tenantAddress?: string;
  ownerAddress?: string;
  amount?: number;
};

type InitializeSingleReleaseEscrowResponse = {
  status: 'SUCCESS' | 'FAILED';
  contractId: string;
  unsignedTransaction?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeployRequestBody;
    const { apartmentId, tenantAddress, ownerAddress, amount } = body;

    if (!apartmentId || !tenantAddress || !ownerAddress) {
      return NextResponse.json(
        { error: 'Missing required escrow deployment fields.' },
        { status: 400 },
      );
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number.' },
        { status: 400 },
      );
    }

    const engagementId = crypto.randomUUID();

    const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? ownerAddress;
    const trustlineAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;

    if (!trustlineAddress) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_USDC_ADDRESS for escrow trustline configuration.' },
        { status: 500 },
      );
    }

    const payload = {
      signer: tenantAddress,
      engagementId,
      title: `Security deposit for apartment ${apartmentId}`,
      description: `Security deposit escrow for apartment ${apartmentId}`,
      amount,
      platformFee: 0,
      roles: {
        approver: tenantAddress,
        serviceProvider: ownerAddress,
        platformAddress,
        releaseSigner: platformAddress,
        disputeResolver: platformAddress,
        receiver: ownerAddress,
      },
      trustline: {
        symbol: 'USDC',
        address: trustlineAddress,
      },
      milestones: [{ description: `Release security deposit for apartment ${apartmentId}` }],
    };

    const result = await trustlessWorkRequest<InitializeSingleReleaseEscrowResponse>(
      '/deployer/single-release',
      {
        method: 'POST',
        body: payload,
      },
    );

    if (result.status !== 'SUCCESS' || !result.unsignedTransaction) {
      return NextResponse.json(
        { error: result.message ?? 'TrustlessWork escrow deploy failed.', payload: result },
        { status: 502 },
      );
    }

    return NextResponse.json({
      status: result.status,
      contractId: result.contractId,
      unsignedXDR: result.unsignedTransaction,
      message: result.message,
      engagementId,
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
      { error: getErrorMessages(error, 'Failed to deploy escrow.') },
      { status: 500 },
    );
  }
}