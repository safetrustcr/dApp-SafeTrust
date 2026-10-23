import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../hasura.js', () => ({ hasuraRequest: vi.fn() }));
import { hasuraRequest } from '../hasura.js';
import { getRentalProperties } from '../rental-properties.js';
beforeEach(() => vi.clearAllMocks());
describe('public rental catalog', () => {
  it('combines registered apartments and hotels without inventing room rates', async () => {
    vi.mocked(hasuraRequest).mockResolvedValue({ apartments: [{ id: 'apt', name: 'Apartment', address: { city: 'Heredia' }, description: null, price: '1200', image_urls: ['/apt.jpg'], owner_id: 'owner' }], hotels: [{ id: 'hotel', name: 'Hotel', address: 'San José', description: null, location_area: null, images: [{ image_url: '/hotel.jpg' }], rooms: [{ room_id: 'room', room_number: '101', price_night: '80', capacity: 2, is_available: true, images: [] }] }, { id: 'empty-hotel', name: 'New Hotel', address: 'Heredia', description: null, location_area: null, images: [], rooms: [] }] });
    const properties = await getRentalProperties('both');
    expect(properties.map((property) => property.kind)).toEqual(['apartment', 'hotel', 'hotel']);
    expect(properties[0]).toMatchObject({ price: 1200, city: 'Heredia' });
    expect(properties[1]).toMatchObject({ price: 80, images: ['/hotel.jpg'] });
    expect(properties[2].price).toBeNull();
    expect(properties[1]).not.toHaveProperty('ownerId');
  });
  it.each(['apartment', 'hotel'] as const)('queries only the %s source', async (kind) => {
    vi.mocked(hasuraRequest).mockResolvedValue({});
    await getRentalProperties(kind);
    expect(hasuraRequest).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ apartments: kind === 'apartment', hotels: kind === 'hotel' }));
    const query = vi.mocked(hasuraRequest).mock.calls[0][0];
    expect(query).not.toContain('wallet_address');
    expect(query).not.toContain('reservations');
  });
});
