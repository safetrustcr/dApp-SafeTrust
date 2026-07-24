import { NextRequest, NextResponse } from 'next/server';

import { getErrorMessages } from '@/lib/trustlesswork-errors';
import {
  TrustlessWorkRequestError,
  trustlessWorkRequest,
} from '@/lib/server/trustlesswork';
import { updateEscrowStatusByContractId } from '@/lib/server/hasura';

type RecoverAction =
  | 'initialize'
  | 'fund'
  | 'approve_milestone'
  | 'release_funds'
  | 'dispute'
  | 'resolve_dispute';

type RecoverRequestBody = {
  txHash?: string;
  action?: RecoverAction;
  contractId?: string;
  engagementId?: string;
  apartmentId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  releaser?: string;
  amount?: number;
  milestoneId?: string;
  approver?: string;
  releaseSigner?: string;
};

const VALID_ACTIONS: RecoverAction[] = [
  'initialize',
  'fund',
  'approve_milestone',
  'release_funds',
  'dispute',
  'resolve_dispute',
];

// Maps a recovered action to the escrows.status it should leave behind.
const ACTION_STATUS: Record<RecoverAction, string> = {
  initialize: 'pending_signature',
  fund: 'funded',
  approve_milestone: 'funded',
  release_funds: 'completed',
  dispute: 'disputed',
  resolve_dispute: 'resolved',
};

// Fields each action must carry beyond contractId, so a recovery request is
// well-formed and auditable even though the DB correction itself is a status set.
const REQUIRED_FIELDS: Record<RecoverAction, (keyof RecoverRequestBody)[]> = {
  initialize: ['engagementId', 'apartmentId', 'senderAddress', 'receiverAddress', 'releaser', 'amount'],
  fund: ['amount'],
  approve_milestone: ['milestoneId', 'approver'],
  release_funds: ['releaseSigner'],
  dispute: [],
  resolve_dispute: [],
};

export async function POST(request: NextRequest) {
  let body: RecoverRequestBody;
  try {
    body = (await request.json()) as RecoverRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { txHash, action, contractId } = body;

  if (!txHash) {
    return NextResponse.json({ error: 'Missing required field: txHash' }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }
  if (!contractId) {
    return NextResponse.json({ error: 'Missing required field: contractId' }, { status: 400 });
  }

  const missing = REQUIRED_FIELDS[action].filter((field) => body[field] === undefined);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `${action} action requires: contractId, ${missing.join(', ')}` },
      { status: 400 },
    );
  }

  // TW indexer is idempotent; the Stellar tx already confirmed, so a re-index
  // failure must not block our own DB correction.
  try {
    await trustlessWorkRequest('/indexer/update-from-txHash', {
      method: 'POST',
      body: { txHash },
    });
  } catch (error) {
    console.error('[recover-from-txhash] TW indexer call failed:', error);
  }

  try {
    const status = ACTION_STATUS[action];
    const result = await updateEscrowStatusByContractId(contractId, status);

    if (result.update_escrows.affected_rows === 0) {
      return NextResponse.json(
        { error: `No escrow record found for contractId: ${contractId}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ recovered: true, action, contractId, txHash, status });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return NextResponse.json(
        { error: error.message, messages: error.messages, payload: error.payload },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: getErrorMessages(error, 'Recovery DB update failed.') },
      { status: 500 },
    );
  }
}
