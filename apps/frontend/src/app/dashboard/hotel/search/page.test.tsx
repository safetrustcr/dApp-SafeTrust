// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';

vi.mock('next/link', () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));
vi.mock('@/components/ui/image', () => ({
  Image: () => <span />,
}));
vi.mock('@/hooks/use-rental-properties', () => ({
  useRentalProperties: () => ({
    properties: [
      {
        id: 'hotel-uuid-1',
        kind: 'hotel',
        name: 'Shikara Hotel',
        address: '329 Calle Santos',
        city: 'San José',
        price: 40.18,
        images: ['/img/room1.png'],
        description: 'A hotel',
        rooms: [
          { id: 'room-1', number: '101', price: 40.18, capacity: 2, available: true, images: [] },
        ],
      },
      {
        id: 'hotel-uuid-2',
        kind: 'hotel',
        name: 'Heredia Inn',
        address: 'Main street',
        city: 'Heredia',
        price: 75,
        images: [],
        description: null,
        rooms: [],
      },
    ],
    loading: false,
    error: '',
    hasMore: false,
    refetch: vi.fn(),
    loadMore: vi.fn(),
  }),
}));

import HotelSearch from './page';

afterEach(cleanup);

describe('hotel search', () => {
  it('lists API hotels and links to the hotel details page with stay dates', () => {
    render(<HotelSearch />);

    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-12-03' } });

    const link = screen.getByRole('link', { name: 'View Shikara Hotel' });
    expect(link.getAttribute('href')).toBe(
      '/dashboard/hotel/details?hotelId=hotel-uuid-1&checkIn=2026-12-01&checkOut=2026-12-03',
    );
    expect(screen.getByText('Heredia Inn')).toBeTruthy();
  });

  it('filters hotels by location', () => {
    render(<HotelSearch />);

    fireEvent.change(screen.getByLabelText('Where to'), { target: { value: 'Heredia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByText('Heredia Inn')).toBeTruthy();
    expect(screen.queryByText('Shikara Hotel')).toBeNull();
  });
});
