// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props} />,
}));
vi.mock('@/components/ui/image', () => ({
  Image: () => <span />,
}));
vi.mock('@/hooks/use-rental-properties', () => ({
  useRentalProperties: () => ({
    properties: [
      {
        id: '8f8043b4-b9c2-4da6-9b4e-225ab7a020f3',
        kind: 'apartment',
        name: 'Saved apartment',
        address: 'Calle 1',
        city: 'San José',
        price: 1200,
        images: [],
        description: null,
      },
      {
        id: 'd2e5f8b8-394b-4012-b1d8-58a08701f200',
        kind: 'hotel',
        name: 'Saved hotel',
        address: 'Main street',
        city: 'Heredia',
        price: 80,
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

import RentPage from './page';

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe('public rent browsing', () => {
  it('renders canonical listing hrefs containing the real UUID', () => {
    render(<RentPage />);
    expect(screen.getByRole('link', { name: 'View Saved apartment' }).getAttribute('href')).toBe(
      '/apartment/8f8043b4-b9c2-4da6-9b4e-225ab7a020f3',
    );
    expect(screen.getByRole('link', { name: 'View Saved hotel' }).getAttribute('href')).toBe(
      '/hotel/d2e5f8b8-394b-4012-b1d8-58a08701f200',
    );
  });

  it('stores supported filter changes in the URL', () => {
    render(<RentPage />);
    fireEvent.change(screen.getByLabelText('Stay type'), { target: { value: 'hotel' } });
    expect(push).toHaveBeenCalledWith('/rent?kind=hotel', { scroll: false });
  });
});
