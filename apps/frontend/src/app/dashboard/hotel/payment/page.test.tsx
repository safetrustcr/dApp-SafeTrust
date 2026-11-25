// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';

const { createReservation } = vi.hoisted(() => ({
  createReservation: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams({
      hotelId: 'hotel-uuid-1',
      roomId: 'room-uuid-1',
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      guests: '2',
    }),
}));
vi.mock('next/link', () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));
vi.mock('@/components/ui/image', () => ({
  Image: () => <span />,
}));
vi.mock('@/core/store/data', () => ({
  useGlobalAuthenticationStore: (selector: (state: { address: string }) => unknown) =>
    selector({ address: 'GDUMMYGUESTWALLET' }),
}));
vi.mock('@/lib/api/listings', () => ({
  fetchPublicHotel: vi.fn(async () => ({
    id: 'hotel-uuid-1',
    kind: 'hotel',
    name: 'Shikara Hotel',
    address: '329 Calle Santos',
    city: 'San José',
    price: 120,
    images: [],
    description: 'A hotel',
    rooms: [
      { id: 'room-uuid-1', number: '101', price: 120, capacity: 2, available: true, images: [] },
    ],
  })),
}));
vi.mock('@/lib/api/hotels', () => ({
  HotelApiError: class HotelApiError extends Error {},
  createReservation,
}));

import HotelPaymentPage from './page';

afterEach(() => {
  cleanup();
  createReservation.mockReset();
});

describe('hotel payment', () => {
  it('creates the reservation and links to the hotel escrow flow', async () => {
    createReservation.mockResolvedValueOnce({
      reservationId: 'reservation-uuid-1',
      total: 240,
      holdExpiresAt: '2026-11-20T12:00:00.000Z',
    });

    render(<HotelPaymentPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Confirm reservation' }));

    expect(createReservation).toHaveBeenCalledWith({
      roomId: 'room-uuid-1',
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      guests: 2,
      walletAddress: 'GDUMMYGUESTWALLET',
    });

    const link = await screen.findByRole('link', { name: 'Continue to secure escrow' });
    expect(link.getAttribute('href')).toBe(
      '/escrow/reservation-uuid-1/escrow/create?kind=hotel-room',
    );
    expect(screen.getByText(/Room held until/)).toBeTruthy();
  });
});
