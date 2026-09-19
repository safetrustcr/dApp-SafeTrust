import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hasura.js', () => ({
  hasuraRequest: vi.fn(),
  HasuraRequestError: class extends Error {},
}));

import { hasuraRequest } from '../hasura.js';
import { checkIdempotency } from '../idempotency.js';

const mockHasuraRequest = vi.mocked(hasuraRequest);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkIdempotency', () => {
  it('returns exists: false when no escrow matches the engagementId', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ escrows: [] });

    const result = await checkIdempotency('ENG001');

    expect(result).toEqual({ exists: false });
    expect(mockHasuraRequest.mock.calls[0][1]).toEqual({ engagement_id: 'ENG001' });
  });

  it('returns exists: true with the cached escrow when one matches', async () => {
    mockHasuraRequest.mockResolvedValueOnce({
      escrows: [{ engagement_id: 'ENG001', contract_id: 'CONTRACT001', status: 'funded' }],
    });

    const result = await checkIdempotency('ENG001');

    expect(result).toEqual({
      exists: true,
      result: { engagement_id: 'ENG001', contract_id: 'CONTRACT001', status: 'funded' },
    });
  });
});
