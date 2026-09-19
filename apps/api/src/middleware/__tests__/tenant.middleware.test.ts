import { describe, expect, it, vi } from 'vitest';

import type { NextFunction, Request, Response } from 'express';

import { tenantMiddleware, type TenantRequest } from '../tenant.middleware.js';

function mockRes() {
  const res = {
    _status: null as number | null,
    _body: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(payload: unknown) {
      this._body = payload;
      return this;
    },
  };
  return res as unknown as Response & { _status: number | null; _body: unknown };
}

function mockReq(tenantHeader?: string) {
  return { headers: tenantHeader ? { 'x-tenant-id': tenantHeader } : {} } as Request;
}

describe('tenantMiddleware', () => {
  it('attaches the tenant from the X-Tenant-ID header and calls next', () => {
    const req = mockReq('hotel_industry');
    const next = vi.fn() as unknown as NextFunction;

    tenantMiddleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as TenantRequest).tenant).toBe('hotel_industry');
  });

  it('defaults to safetrust when the header is absent', () => {
    const req = mockReq();
    const next = vi.fn() as unknown as NextFunction;

    tenantMiddleware(req, mockRes(), next);

    expect((req as TenantRequest).tenant).toBe('safetrust');
    expect(next).toHaveBeenCalledOnce();
  });

  it('400s on an invalid tenant id', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    tenantMiddleware(mockReq('not-a-tenant'), res, next);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({
      error: 'Invalid X-Tenant-ID. Must be one of: safetrust, hotel_industry',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
