/**
 * Composition contract for apps/api (#554).
 *
 * createApp() is the app production serves: index.ts only loads env, starts
 * Firebase Admin and listens. These tests exercise the composed app over HTTP,
 * so a middleware registered twice, or a router mounted only in index.ts, fails
 * CI instead of silently working through Express fall-through.
 */
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_CONTRACT } from '../../../mcp/src/lib/api-contract.js';
import { hasuraRequest } from '../src/services/hasura.js';
import { getUserWallets } from '../src/services/escrow-authz.js';
import { checkWalletReadiness, buildChangeTrustXdr, getGuestPrimaryWallet } from '../src/services/wallet-readiness.js';

const counters = vi.hoisted(() => ({ tenant: 0, requestId: 0 }));

vi.mock('../src/middleware/auth.middleware.js', () => ({
  authenticateFirebase: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { uid: 'composition-test-user', email: undefined, role: 'guest' };
    next();
  },
}));

vi.mock('../src/middleware/tenant.middleware.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/middleware/tenant.middleware.js')>();
  return {
    ...actual,
    tenantMiddleware: (...args: Parameters<typeof actual.tenantMiddleware>) => {
      counters.tenant += 1;
      return actual.tenantMiddleware(...args);
    },
  };
});

vi.mock('../src/http/error-middleware.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/http/error-middleware.js')>();
  return {
    ...actual,
    requestIdMiddleware: (...args: Parameters<typeof actual.requestIdMiddleware>) => {
      counters.requestId += 1;
      return actual.requestIdMiddleware(...args);
    },
  };
});

vi.mock('../src/services/hasura.js', () => ({ hasuraRequest: vi.fn() }));

vi.mock('../src/services/hotels-db.js', () => ({
  findHotelUserByFirebaseUidOrEmail: vi.fn().mockResolvedValue(null),
  isPlatformAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock('../src/services/escrow-authz.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getUserWallets: vi.fn(),
}));

vi.mock('../src/services/wallet-readiness.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkWalletReadiness: vi.fn(),
  buildChangeTrustXdr: vi.fn(),
  getGuestPrimaryWallet: vi.fn(),
}));

import { createApp } from '../src/app.js';

const here = dirname(fileURLToPath(import.meta.url));
const GUEST = 'GGUEST1111111111111111111111111111111111111111111111111';
const APARTMENT = '550e8400-e29b-41d4-a716-446655440000';
const ROOM = '550e8400-e29b-41d4-a716-446655440002';
const USDC_ISSUER = 'GISSUER';

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

beforeEach(() => {
  vi.clearAllMocks();
  counters.tenant = 0;
  counters.requestId = 0;
  process.env.USDC_TRUSTLINE_ADDRESS = USDC_ISSUER;

  vi.mocked(checkWalletReadiness).mockResolvedValue({
    ready: true,
    network: 'testnet',
    asset: { code: 'USDC', issuer: USDC_ISSUER },
    amount: '10.0000000',
    guest: { wallet: GUEST, checks: {} },
    counterparties: { hostCanReceive: { ok: true }, platformCanReceive: { ok: true } },
  });
  vi.mocked(buildChangeTrustXdr).mockResolvedValue('AAAA-TRUSTLINE-XDR');
  vi.mocked(getGuestPrimaryWallet).mockResolvedValue(GUEST);
  vi.mocked(getUserWallets).mockResolvedValue([GUEST]);
  vi.mocked(hasuraRequest).mockImplementation((async (query: string) => {
    if (query.includes('rooms_by_pk')) {
      return {
        rooms_by_pk: {
          room_id: ROOM,
          capacity: 4,
          price_night: '100',
          hotel: { owner_user_id: 'owner-1' },
        },
      };
    }
    if (query.includes('insert_reservations_one')) {
      return { insert_reservations_one: { id: 'reservation-1' } };
    }
    throw new Error(`unexpected Hasura query in composition test: ${query}`);
  }) as typeof hasuraRequest);
});

describe('createApp composition', () => {
  it('only boots the app in index.ts: env, Firebase, createApp and listen', () => {
    const indexSource = readFileSync(join(here, '../src/index.ts'), 'utf8');
    expect(indexSource).toContain("import './config/env.js';");
    expect(indexSource).toContain('initFirebaseAdmin()');
    expect(indexSource).toContain('createApp()');
    expect(indexSource).toContain('.listen(');
    expect(indexSource).not.toMatch(/\bapp\.(use|get|post|put|patch|delete)\(/);
  });

  it('mounts readiness, notification devices and hotel reservations exactly once in app.ts', () => {
    const appSource = readFileSync(join(here, '../src/app.ts'), 'utf8');
    for (const [mount, router] of [
      ['/api/escrow', 'readinessRouter'],
      ['/api/notifications', 'notificationDevicesRouter'],
      ['/api/hotel-reservations', 'hotelReservationsRouter'],
    ]) {
      const mounts = appSource.match(new RegExp(`app\\.use\\('${mount}', ${router}\\)`, 'g')) ?? [];
      expect(mounts, `${router} must be mounted once at ${mount}`).toHaveLength(1);
    }
  });

  it('runs tenant and request-id middleware once per request', async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.status).toBe(200);
    expect(counters).toEqual({ tenant: 1, requestId: 1 });
  });
});

describe('createApp routes that used to live only in index.ts', () => {
  it('GET /health reports the Stellar network', async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      firebase: 'configured',
      stellarNetwork: expect.stringMatching(/^(TESTNET|PUBLIC)$/),
    });
  });

  it('GET /api/escrow/readiness serves the wallet readiness contract', async () => {
    const res = await fetch(`${baseUrl}/api/escrow/readiness?apartmentId=${APARTMENT}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    for (const key of API_CONTRACT.readiness.response) {
      expect(body, `readiness response lost ${key}`).toHaveProperty(key);
    }
  });

  it('POST /api/escrow/readiness/trustline builds an unsigned trustline transaction', async () => {
    const res = await fetch(`${baseUrl}/api/escrow/readiness/trustline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: GUEST }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ unsignedXdr: 'AAAA-TRUSTLINE-XDR' });
    expect(buildChangeTrustXdr).toHaveBeenCalledWith(expect.anything(), GUEST, USDC_ISSUER);
  });

  it('POST /api/hotel-reservations creates a reservation', async () => {
    const checkIn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const checkOut = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const res = await fetch(`${baseUrl}/api/hotel-reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': 'hotel_industry' },
      body: JSON.stringify({ roomId: ROOM, checkIn, checkOut, guests: 2, walletAddress: GUEST }),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ reservationId: 'reservation-1', total: 300 });
  });
});
