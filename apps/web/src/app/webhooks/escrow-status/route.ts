import { createHmac, timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { updateEscrowStatus } from '@/lib/server/hasura';

const STATUS_MAP: Record<string, string> = {
  funded: 'funded',
  active: 'funded',
  completed: 'completed',
  disputed: 'disputed',
  resolved: 'resolved',
  cancelled: 'cancelled',
};

function getSignatureHeader(request: NextRequest) {
  return (
    request.headers.get('x-trustless-work-signature') ??
    request.headers.get('x-webhook-signature') ??
    request.headers.get('x-signature')
  );
}

function normalizeSignature(signature: string) {
  return signature.startsWith('sha256=') ? signature.slice(7) : signature;
}

function verifySignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const actual = normalizeSignature(signature);

  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export async function POST(request: NextRequest) {
  const secret = process.env.TRUSTLESS_WORK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Missing TRUSTLESS_WORK_WEBHOOK_SECRET' }, { status: 500 });
  }

  const signature = getSignatureHeader(request);
  if (!signature) {
    return NextResponse.json({ error: 'Missing webhook signature header' }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    contractId?: string;
    engagementId?: string;
    status?: string;
  };

  const mappedStatus = body.status ? STATUS_MAP[body.status] : undefined;
  if (!body.engagementId || !body.contractId || !body.status) {
    return NextResponse.json({ error: 'Missing webhook payload fields' }, { status: 400 });
  }

  if (!mappedStatus) {
    console.warn(`[webhook] Unknown status received: ${body.status}`);
    return NextResponse.json({ error: `Unknown status: ${body.status}` }, { status: 400 });
  }

  try {
    const result = await updateEscrowStatus(body.engagementId, mappedStatus);
    const affected = result.update_escrows.affected_rows;

    console.log(`[webhook] ✅ status 200 — escrow synced`);
    console.log(`  contractId:    ${body.contractId}`);
    console.log(`  engagementId:  ${body.engagementId}`);
    console.log(`  status:        ${body.status} → ${mappedStatus}`);
    console.log(`  rows updated:  ${affected}`);

    return NextResponse.json({
      success: true,
      engagementId: body.engagementId,
      status: mappedStatus,
      rowsUpdated: affected,
    });
  } catch (error) {
    console.error('[webhook] ❌ Hasura mutation failed:', error);
    return NextResponse.json({ error: 'Failed to sync escrow status' }, { status: 500 });
  }
}