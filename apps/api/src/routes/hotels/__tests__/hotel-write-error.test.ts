import { describe, expect, it } from 'vitest';
import { HasuraRequestError } from '../../../services/hasura.js';
import { hotelWriteError } from '../hotel-write-error.js';
describe('hotel write errors', () => {
  it('reports missing configuration and missing schema separately', () => {
    expect(hotelWriteError(new HasuraRequestError('Missing required env var: HASURA_ADMIN_SECRET'))).toMatchObject({ status: 503, code: 'DATABASE_NOT_CONFIGURED' });
    expect(hotelWriteError(new HasuraRequestError("field 'images' not found in type: 'hotel_industry_hotels'"))).toMatchObject({ status: 503, code: 'HOTEL_SCHEMA_NOT_READY' });
  });
  it('reports an unreachable database', () => {
    expect(hotelWriteError(new TypeError('fetch failed'))).toMatchObject({ status: 503, code: 'DATABASE_UNAVAILABLE' });
  });
  it('keeps unclassified diagnostics on the server', () => {
    const response = hotelWriteError(new Error('private diagnostic'));
    expect(response.status).toBe(500);
    expect(response.message).not.toContain('private diagnostic');
  });
});
