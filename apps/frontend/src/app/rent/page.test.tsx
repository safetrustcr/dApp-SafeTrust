// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/rent', () => ({
  HotelHeader: () => null,
  FilterSidebar: () => null,
  ApartmentGrid: ({ apartments, onApartmentClick }: { apartments: Array<{ id: string; name: string }>; onApartmentClick: (property: unknown) => void }) => <div>{apartments.map((property) => <button key={property.id} onClick={() => onApartmentClick(property)}>{property.name}</button>)}</div>,
}));
vi.mock('@/components/rent/HotelListingDialog', () => ({ HotelListingDialog: () => null }));
vi.mock('@/hooks/use-rental-properties', () => ({ useRentalProperties: (kind: string) => ({
  properties: [
    { id: 'saved-apartment', kind: 'apartment', name: 'Saved apartment', address: 'San José', city: 'San José', price: 1200, images: [], description: null },
    { id: 'saved-hotel', kind: 'hotel', name: 'Saved hotel', address: 'Heredia', city: 'Heredia', price: 80, images: [], description: null, rooms: [] },
  ].filter((property) => kind === 'both' || property.kind === kind),
  loading: false, error: '', hasMore: false, refetch: vi.fn(), loadMore: vi.fn(),
}) }));
import RentPage from './page';
afterEach(cleanup);
describe('registered property filters', () => {
  it('switches between both types, apartments, and hotels', () => {
    render(<RentPage />);
    expect(screen.getByText('Saved apartment')).toBeTruthy();
    expect(screen.getByText('Saved hotel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hotels' }));
    expect(screen.queryByText('Saved apartment')).toBeNull();
    expect(screen.getByText('Saved hotel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apartments' }));
    expect(screen.getByText('Saved apartment')).toBeTruthy();
    expect(screen.queryByText('Saved hotel')).toBeNull();
    fireEvent.click(screen.getByText('Saved apartment'));
    expect(push).toHaveBeenCalledWith('/escrow/saved-apartment/escrow/create');
  });
});
