import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { TrustlessWorkRequestError, trustlessWorkRequest } from '@/lib/server/trustlesswork';

type ChangeMilestoneStatusRequestBody = {
  contractId?: string;
  milestoneIndex?: number;
  newEvidence?: string;
  newStatus?: string;
  serviceProvider?: string;
};

type ChangeMilestoneStatusResponse = {
  status: 'SUCCESS' | 'FAILED';
  unsignedTransaction?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChangeMilestoneStatusRequestBody;
    const { contractId, milestoneIndex, newEvidence, newStatus, serviceProvider } = body;

    if (!contractId || !serviceProvider || !newStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, serviceProvider, newStatus.' },
        { status: 400 },
      );
    }

    if (typeof milestoneIndex !== 'number' || !Number.isInteger(milestoneIndex) || milestoneIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid milestoneIndex: must be a non-negative integer.' },
        { status: 400 },
      );
    }

    const result = await trustlessWorkRequest<ChangeMilestoneStatusResponse>(
      '/escrow/single-release/change-milestone-status',
      {
        method: 'POST',
        body: {
          contractId,
          milestoneIndex,
          newEvidence: newEvidence ?? '',
          newStatus,
          serviceProvider,
        },
      },
    );

    if (result.status !== 'SUCCESS' || !result.unsignedTransaction) {
      return NextResponse.json(
        { error: result.message ?? 'TrustlessWork change-milestone-status failed.', payload: result },
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
      { error: getErrorMessages(error, 'Failed to update milestone status.') },
      { status: 500 },
    );
  }
}
