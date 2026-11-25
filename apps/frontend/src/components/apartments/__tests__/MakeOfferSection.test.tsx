// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MakeOfferSection } from '../MakeOfferSection';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const getMyBidsMock = vi.fn();
const createBidMock = vi.fn();
vi.mock('@/lib/api/bids', () => ({
  getMyBids: (...args: unknown[]) => getMyBidsMock(...args),
  createBid: (...args: unknown[]) => createBidMock(...args),
}));

describe('MakeOfferSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyBidsMock.mockResolvedValue({ bids: [], totalCount: 0, limit: 1, offset: 0 });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing for the apartment owner', () => {
    const { container } = render(
      <MakeOfferSection
        apartmentId="apt-1"
        defaultPrice={1000}
        isOwner={true}
        isAuthenticated={true}
        authLoading={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('submits a new offer when Make an offer form is filled', async () => {
    createBidMock.mockResolvedValueOnce({
      bid: {
        id: 'bid-1',
        apartment_id: 'apt-1',
        tenant_id: 'guest-1',
        current_status: 'PENDING',
        proposed_price: 1150,
        desired_move_in: '2026-12-10T00:00:00.000Z',
        created_at: '2026-11-25T10:00:00Z',
        updated_at: '2026-11-25T10:00:00Z',
      },
    });

    render(
      <MakeOfferSection
        apartmentId="apt-1"
        defaultPrice={1000}
        isOwner={false}
        isAuthenticated={true}
        authLoading={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Make an offer' }));
    fireEvent.change(screen.getByLabelText('Proposed monthly price (USD)'), {
      target: { value: '1150' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit offer' }));

    await waitFor(() => {
      expect(createBidMock).toHaveBeenCalledWith(
        expect.objectContaining({
          apartmentId: 'apt-1',
          proposedPrice: 1150,
        }),
      );
    });
  });

  it('shows Start escrow link when guest has an APPROVED bid', async () => {
    getMyBidsMock.mockResolvedValueOnce({
      bids: [
        {
          id: 'bid-1',
          apartment_id: 'apt-1',
          tenant_id: 'guest-1',
          current_status: 'APPROVED',
          proposed_price: 1150,
          desired_move_in: '2026-12-10T00:00:00.000Z',
          created_at: '2026-11-25T10:00:00Z',
          updated_at: '2026-11-25T10:00:00Z',
        },
      ],
      totalCount: 1,
      limit: 1,
      offset: 0,
    });

    render(
      <MakeOfferSection
        apartmentId="apt-1"
        defaultPrice={1000}
        isOwner={false}
        isAuthenticated={true}
        authLoading={false}
      />,
    );

    const escrowLink = await screen.findByRole('link', { name: 'Start escrow' });
    expect(escrowLink.getAttribute('href')).toBe('/escrow/apt-1/escrow/create');
  });
});
