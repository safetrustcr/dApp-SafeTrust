import { describe, it, expect, vi } from 'vitest';
import { tenantMiddleware } from '../tenant.middleware.js';
import type { Request, Response, NextFunction } from 'express';

function mockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers, body: {} } as Partial<Request>;
}

function mockRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; _status: number; _body: unknown } {
  const res = {
    _status: 200,
    _body: null as unknown,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockImplementation((body) => { res._body = body; return res; }),
  };
  res.status.mockImplementation((code: number) => { res._status = code; return res; });
  return res;
}

function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

describe('tenantMiddleware', () => {

  it('defaults to safetrust when X-Tenant-ID header is absent', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    tenantMiddleware(req as Request, res as unknown as Response, next);

    expect((req as Request).tenant).toBe('safetrust');
    expect(next).toHaveBeenCalled();
  });

  it('sets req.tenant to safetrust when header is safetrust', () => {
    const req = mockReq({ 'x-tenant-id': 'safetrust' });
    const res = mockRes();
    const next = mockNext();

    tenantMiddleware(req as Request, res as unknown as Response, next);

    expect((req as Request).tenant).toBe('safetrust');
    expect(next).toHaveBeenCalled();
  });

  it('sets req.tenant to hotel_industry when header is hotel_industry', () => {
    const req = mockReq({ 'x-tenant-id': 'hotel_industry' });
    const res = mockRes();
    const next = mockNext();

    tenantMiddleware(req as Request, res as unknown as Response, next);

    expect((req as Request).tenant).toBe('hotel_industry');
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 for an invalid tenant value', () => {
    const req = mockReq({ 'x-tenant-id': 'invalid_tenant' });
    const res = mockRes();
    const next = mockNext();

    tenantMiddleware(req as Request, res as unknown as Response, next);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: 'Invalid X-Tenant-ID',
      received: 'invalid_tenant',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for empty string tenant value', () => {
    const req = mockReq({ 'x-tenant-id': '' });
    const res = mockRes();
    const next = mockNext();

    tenantMiddleware(req as Request, res as unknown as Response, next);

    expect(res._status).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });
});