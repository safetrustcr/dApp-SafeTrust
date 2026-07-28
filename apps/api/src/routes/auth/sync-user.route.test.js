import { describe, it, expect } from 'vitest';

describe('Auth routes', () => {
  it('should export a router function', async () => {
    const module = await import('./sync-user.route.js');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});