/**
 * Contract between the escrow detail page and apps/api (#552).
 *
 * EscrowDetailView.tsx hands each action's build route to useEscrowAction as
 * `apiRoute: '/api/escrow/...'`. This file reads those strings from the
 * frontend source and POSTs each one to the real createApp() composition
 * without an Idempotency-Key. Every build route must answer 400
 * "Idempotency-Key required": a 404 means the frontend and API paths drifted
 * apart, any other answer means the route lost its replay protection.
 */
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.middleware.js', () => ({
  authenticateFirebase: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { uid: 'contract-test-user', email: undefined, role: 'guest' };
    next();
  },
}));

import { createApp } from '../src/app.js';

const here = dirname(fileURLToPath(import.meta.url));
const detailViewSource = readFileSync(
  join(here, '../../frontend/src/components/escrow/EscrowDetailView.tsx'),
  'utf8',
);

const frontendBuildRoutes = [...detailViewSource.matchAll(/apiRoute:\s*'([^']+)'/g)].map((m) => m[1]);

let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('EscrowDetailView build routes', () => {
  it('finds the action routes in the frontend source', () => {
    expect(frontendBuildRoutes).toEqual(
      expect.arrayContaining([
        '/api/escrow/fund',
        '/api/escrow/milestone-status',
        '/api/escrow/approve-milestone',
        '/api/escrow/release-funds',
      ]),
    );
  });

  it.each(frontendBuildRoutes)('%s exists in apps/api and requires an Idempotency-Key', async (route) => {
    const res = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(res.status, `POST ${route} is not served by apps/api`).not.toBe(404);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Idempotency-Key required' });
  });
});
