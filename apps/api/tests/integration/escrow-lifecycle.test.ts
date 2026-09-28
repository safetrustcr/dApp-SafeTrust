import { describe, it, expect } from 'vitest';
import { INTEGRATION_ENABLED } from './setup';

const API_URL = process.env.API_URL ?? 'http://localhost:3002';
const SENDER  = process.env.INTEGRATION_SENDER_ADDRESS ?? '';
const RECEIVER = process.env.INTEGRATION_RECEIVER_ADDRESS ?? '';

describe.skipIf(!INTEGRATION_ENABLED)('TrustlessWork escrow lifecycle', () => {
  let engagementId: string;
  let unsignedXDR: string;

  it('POST /api/escrow/deploy → returns unsignedXDR from TrustlessWork', async () => {
    engagementId = `integration-test-${Date.now()}`;
    const res = await fetch(`${API_URL}/api/escrow/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apartmentId: process.env.INTEGRATION_APARTMENT_ID,
        senderAddress: SENDER,
        receiverAddress: RECEIVER,
        amount: 100,
        engagementId,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.unsignedXDR).toBeTypeOf('string');
    expect(data.unsignedXDR.length).toBeGreaterThan(100);
    expect(data.cached).toBe(false);
    unsignedXDR = data.unsignedXDR;
  });
});
