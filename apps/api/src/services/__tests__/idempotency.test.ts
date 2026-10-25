import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIdempotency } from '../idempotency.js';

vi.mock('../hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));

import { hasuraRequest } from '../hasura.js';

describe('checkIdempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns exists: false when engagementId not found in DB', async () => {
    vi.mocked(hasuraRequest).mockResolvedValueOnce({ escrows: [] });

    const result = await checkIdempotency('engagement-new-001');

    expect(result.exists).toBe(false);
  });

  it('returns exists: true with result when engagementId found', async () => {
    vi.mocked(hasuraRequest).mockResolvedValueOnce({
      escrows: [{
        engagement_id: 'engagement-apt-001',
        contract_id: 'CAZT1234',
        status: 'funded',
      }],
    });

    const result = await checkIdempotency('engagement-apt-001');

    expect(result.exists).toBe(true);
    if (result.exists) {
      expect(result.result.contract_id).toBe('CAZT1234');
      expect(result.result.status).toBe('funded');
    }
  });

  it('queries with correct GraphQL and engagementId variable', async () => {
    vi.mocked(hasuraRequest).mockResolvedValueOnce({ escrows: [] });

    await checkIdempotency('engagement-test-999');

    expect(hasuraRequest).toHaveBeenCalledWith(
      expect.stringContaining('CheckIdempotency'),
      { engagementId: 'engagement-test-999' }
    );
  });

  it('returns exists: false when escrows array is undefined (Hasura error)', async () => {
    vi.mocked(hasuraRequest).mockResolvedValueOnce({});

    const result = await checkIdempotency('engagement-broken');
    expect(result.exists).toBe(false);
  });
});