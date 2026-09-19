import { NextRequest, NextResponse } from 'next/server';

import { hasuraRequest, insertEscrowRecord } from '@/lib/server/hasura';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import {
  extractTransactionHash,
  TrustlessWorkRequestError,
  trustlessWorkRequest,
} from '@/lib/server/trustlesswork';
import {
  dbInitializeEscrow,
  dbFundEscrow,
  dbApproveMilestone,
  dbReleaseFunds,
  dbDisputeEscrow,
  dbResolveDispute,
} from '@/lib/server/escrow-db';

type EscrowAction =
  | 'initialize'
  | 'fund'
  | 'approve_milestone'
  | 'release_funds'
  | 'dispute'
  | 'resolve_dispute';

type SendTransactionBody = {
  signedXdr?: string;
  action?: EscrowAction;
  contractId?: string;
  engagementId?: string;
  propertyId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  releaser?: string;
  amount?: number;
  milestoneId?: string;
  approver?: string;
  releaseSigner?: string;
};

type SendTransactionResponse = {
  status: 'SUCCESS' | 'FAILED';
  message: string;
};

const VALID_ACTIONS: EscrowAction[] = [
  'initialize',
  'fund',
  'approve_milestone',
  'release_funds',
  'dispute',
  'resolve_dispute',
];

const REQUIRED_FIELDS: Record<EscrowAction, (keyof SendTransactionBody)[]> = {
  initialize: ['engagementId', 'propertyId', 'senderAddress', 'receiverAddress', 'releaser', 'amount'],
  fund: ['amount'],
  approve_milestone: ['milestoneId', 'approver'],
  release_funds: ['releaseSigner'],
  dispute: [],
  resolve_dispute: [],
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export async function POST(request: NextRequest) {
  let body: SendTransactionBody;
  try {
    body = (await request.json()) as SendTransactionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const {
    signedXdr,
    action,
    contractId,
    engagementId,
    propertyId,
    senderAddress,
    receiverAddress,
    releaser,
    amount,
    milestoneId,
    approver,
    releaseSigner,
  } = body;

  if (!action) {
    return NextResponse.json(
      { error: 'Missing required field: action' },
      { status: 400 },
    );
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  if (!isNonEmptyString(signedXdr) || !isNonEmptyString(contractId)) {
    return NextResponse.json(
      { error: 'Missing required fields: signedXdr, contractId' },
      { status: 400 },
    );
  }

  const missing = REQUIRED_FIELDS[action].filter((field) => {
    const value = body[field];
    return value == null || (field !== 'amount' && !isNonEmptyString(value));
  });
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `${action} action requires: contractId, ${missing.join(', ')}` },
      { status: 400 },
    );
  }

  if (action === 'initialize' || action === 'fund') {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number.' },
        { status: 400 },
      );
    }
  }

  let result: SendTransactionResponse & Record<string, unknown>;
  try {
    result = await trustlessWorkRequest<SendTransactionResponse & Record<string, unknown>>(
      '/helper/send-transaction',
      {
        method: 'POST',
        body: { signedXdr },
      },
    );
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        { error: error.message, messages: error.messages, payload: error.payload },
        { status: error.statusCode },
      );
    }
    const messages = getErrorMessages(error, 'Failed to submit signed transaction.');
    return NextResponse.json({ error: messages[0], messages }, { status: 502 });
  }

  if (result.status !== 'SUCCESS') {
    const messages = getErrorMessages(result, 'TrustlessWork send-transaction failed.');
    return NextResponse.json({ error: messages[0], messages, payload: result }, { status: 502 });
  }

  const resolvedContractId = (result.contractId as string | undefined) ?? contractId;
  let insertedId: string | undefined;

  try {
    switch (action) {
      case 'initialize': {
        await dbInitializeEscrow({
          contractId: resolvedContractId,
          engagementId: engagementId!,
          apartmentId: propertyId!,
          senderAddress: senderAddress!,
          receiverAddress: receiverAddress!,
          releaser: releaser!,
          amount: amount!,
        });
        const existing = await hasuraRequest<{ escrows: { id: string }[] }>(
          `query FindEscrowByContractId($contractId: String!) {
            escrows(where: { contract_id: { _eq: $contractId } }) { id }
          }`,
          { contractId: resolvedContractId },
        );
        if (existing.escrows.length > 0) {
          insertedId = existing.escrows[0].id;
        } else {
          const record = await insertEscrowRecord({
            contractId: resolvedContractId,
            engagementId: engagementId!,
            propertyId: propertyId!,
            senderAddress: senderAddress!,
            receiverAddress: receiverAddress!,
            amount: amount!,
            status: 'funded',
          });
          insertedId = record.insert_escrows_one.id;
        }
        break;
      }
      case 'fund':
        await dbFundEscrow(resolvedContractId, amount!);
        break;
      case 'approve_milestone':
        await dbApproveMilestone(resolvedContractId, milestoneId!, approver!);
        break;
      case 'release_funds':
        await dbReleaseFunds(resolvedContractId, releaseSigner!);
        break;
      case 'dispute':
        await dbDisputeEscrow(resolvedContractId);
        break;
      case 'resolve_dispute':
        await dbResolveDispute(resolvedContractId);
        break;
    }
  } catch (error) {
    const message = getErrorMessages(error, 'Database synchronization failed.');
    return NextResponse.json(
      {
        error: 'Transaction confirmed on-chain, but database synchronization failed.',
        transactionHash: extractTransactionHash(result),
        contractId: resolvedContractId,
        detail: message[0],
      },
      { status: 500 },
    );
  }

  const responsePayload: Record<string, unknown> = {
    status: result.status,
    message: result.message,
    contractId: resolvedContractId,
    transactionHash: extractTransactionHash(result),
    engagementId,
  };

  if (action === 'initialize') {
    responsePayload.escrowId = insertedId;
  }

  return NextResponse.json(responsePayload);
}
