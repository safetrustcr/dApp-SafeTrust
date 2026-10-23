import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../async-handler.js';

function makeRes(): Response {
  return {} as Response;
}

describe('asyncHandler', () => {
  it('calls next(err) when the wrapped async function rejects', async () => {
    const boom = new Error('upstream exploded');
    const handler = asyncHandler(async (_req, _res, _next) => {
      throw boom;
    });

    const next = vi.fn() as unknown as NextFunction;
    await handler({} as Request, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(boom);
  });

  it('does not call next(err) when the handler resolves normally', async () => {
    const handler = asyncHandler(async (_req, res, _next) => {
      (res as unknown as { ok: boolean }).ok = true;
    });

    const next = vi.fn() as unknown as NextFunction;
    const res = makeRes();
    await handler({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
