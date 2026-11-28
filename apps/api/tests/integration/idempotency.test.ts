import { describe, it, expect } from 'vitest';
import { INTEGRATION_ENABLED } from './setup';

const API_URL = process.env.API_URL ?? 'http://localhost:3002';
const SENDER  = process.env.INTEGRATION_SENDER_ADDRESS ?? '';
const RECEIVER = process.env.INTEGRATION_RECEIVER_ADDRESS ?? '';

describe.skipIf(!INTEGRATION_ENABLED)('TrustlessWork idempotency guard', () => {
  it('POST /api/escrow/deploy with same engagementId → returns cached: true', async () => {
    const engagementId = `idempotency-test-${Date.now()}`;
    
    // First deployment call
    const res1 = await fetch(`${API_URL}/api/escrow/deploy`, {
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
    expect(res1.status).toBe(200);

    // Second deployment call (Idempotency check)
    const res2 = await fetch(`${API_URL}/api/escrow/deploy`, {
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

    expect(res2.status).toBe(200);
    const data = await res2.json();
    expect(data.cached).toBe(true);
  });
});
