import { describe, expect, it } from 'vitest';
import { apiCorsOptions } from '../cors-options.js';
describe('API CORS', () => {
  it('allows tenant and idempotency headers for hotel and escrow requests', () => {
    const options = apiCorsOptions('http://localhost:3001, https://app.example.com');
    expect(options.origin).toEqual(['http://localhost:3001', 'https://app.example.com']);
    expect(options.allowedHeaders).toEqual(expect.arrayContaining(['Authorization', 'X-Tenant-ID', 'Idempotency-Key']));
  });
});
