// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EscrowDetailLayout } from './EscrowDetailLayout';
import { GET_ESCROW_TRANSACTIONS } from '@/graphql/queries/escrow-queries';

const query = vi.hoisted(() => vi.fn());
vi.mock('@apollo/client', async () => ({
  ...(await vi.importActual('@apollo/client')),
  useQuery: query,
}));

describe('EscrowDetailLayout', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'testnet');
    vi.stubEnv('STELLAR_NETWORK_PASSPHRASE', 'Test SDF Network ; September 2015');
    query.mockReset();
    query.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('passes engagementId to ProcessStepper so GET_ESCROW_TRANSACTIONS is queried and renders transaction details', () => {
    const sampleDate = new Date(2026, 10, 24, 12, 0, 0).toISOString();
    query.mockReturnValue({
      data: {
        escrow_transactions: [
          {
            action: 'initialize',
            from_status: null,
            to_status: 'created',
            tx_hash: '4ef13e4f16b2084c718b958c2876a39498d578b80b2a8d67c5e2195f087da23a',
            actor_uid: 'guest-1',
            created_at: sampleDate,
            source: 'submit',
          },
        ],
      },
      loading: false,
    });

    const { container } = render(
      <EscrowDetailLayout
        invoiceNumber="INV-001"
        status="paid"
        engagementId="eng-123"
      >
        <div>Body</div>
      </EscrowDetailLayout>,
    );

    expect(query).toHaveBeenCalledWith(
      GET_ESCROW_TRANSACTIONS,
      expect.objectContaining({
        variables: { engagement_id: 'eng-123' },
        skip: false,
      }),
    );

    expect(container.textContent).toContain('Guest created escrow');
    expect(container.textContent).toContain('November 24, 2026');
    const link = container.querySelector('a[href*="stellar.expert/explorer/testnet/tx/"]');
    expect(link).not.toBeNull();
  });

  it('keeps the status-only path when engagementId is omitted', () => {
    const { container } = render(
      <EscrowDetailLayout invoiceNumber="INV-001" status="pending">
        <div>Body</div>
      </EscrowDetailLayout>,
    );

    expect(query).toHaveBeenCalledWith(
      GET_ESCROW_TRANSACTIONS,
      expect.objectContaining({
        skip: true,
      }),
    );
    const currentStep = container.querySelector('[aria-current="step"]');
    expect(currentStep?.textContent).toContain('Escrow created');
  });
});
