/**
 * Contract between apps/api and the SafeTrust MCP server (#531).
 *
 * mcp/src/lib/api-contract.ts lists every route the MCP calls, the request
 * fields it sends and the response fields it reads; mcp/src/lib/escrow-roles.ts
 * shows contributors which wallet fills each role. This file runs the real
 * routers and handlers against those tables, so renaming a route, moving a
 * mount point, changing a response field or a role assignment fails here,
 * instead of in a contributor's chat.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_CONTRACT } from '../../../mcp/src/lib/api-contract.js';
import { ACTION_SIGNER_ROLE, DEPLOY_ROLES } from '../../../mcp/src/lib/escrow-roles.js';

vi.mock('../src/services/trustlesswork.js', () => ({ trustlessWorkRequest: vi.fn() }));
vi.mock('../src/services/hasura.js', () => ({ hasuraRequest: vi.fn() }));
vi.mock('../src/services/idempotency.js', () => ({ checkIdempotency: vi.fn() }));
vi.mock('../src/services/hotel-reservation-escrow.js', () => ({
  getHotelReservationEscrowTerms: vi.fn(),
  getHotelUserWallets: vi.fn(),
  getHotelReservation: vi.fn(),
  hotelBookingView: vi.fn(),
}));
vi.mock('../src/services/apartment-escrow-terms.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getApartmentEscrowTerms: vi.fn(),
}));
vi.mock('../src/services/escrow-authz.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getUserWallets: vi.fn(),
  authorizeEscrowAction: vi.fn(),
}));
vi.mock('../src/services/pending-actions.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  expireStaleActions: vi.fn(),
  findLiveAction: vi.fn(),
  insertPendingAction: vi.fn(),
}));
vi.mock('../src/lib/stellar-xdr.js', () => ({ transactionHash: vi.fn(), transactionExpiry: vi.fn() }));

import deployRouter from '../src/routes/escrow/deploy.route.js';
import fundRouter from '../src/routes/escrow/fund.route.js';
import readinessRouter from '../src/routes/escrow/readiness.route.js';
import { getReadinessHandler } from '../src/routes/escrow/readiness.handler.js';
import { Horizon } from '@stellar/stellar-sdk';
import { hasuraRequest } from '../src/services/hasura.js';
import { clearHorizonCache } from '../src/services/wallet-readiness.js';
import { deployEscrowHandler } from '../src/routes/escrow/deploy.handler.js';
import { fundEscrowHandler } from '../src/routes/escrow/fund.handler.js';
import { trustlessWorkRequest } from '../src/services/trustlesswork.js';
import { checkIdempotency } from '../src/services/idempotency.js';
import { getHotelReservationEscrowTerms } from '../src/services/hotel-reservation-escrow.js';
import { getApartmentEscrowTerms } from '../src/services/apartment-escrow-terms.js';
import { ACTION_ROLE, authorizeEscrowAction, getUserWallets, rolesFor } from '../src/services/escrow-authz.js';
import { findLiveAction, insertPendingAction } from '../src/services/pending-actions.js';
import { transactionExpiry, transactionHash } from '../src/lib/stellar-xdr.js';
import { mockNext, mockRes } from '../src/routes/escrow/__tests__/helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const indexSource = readFileSync(join(here, '../src/index.ts'), 'utf8');

const GUEST = 'GGUEST1111111111111111111111111111111111111111111111111';
const HOST = 'GHOST11111111111111111111111111111111111111111111111111';
const PLATFORM = 'GPLATFORM111111111111111111111111111111111111111111111';
const APARTMENT = '550e8400-e29b-41d4-a716-446655440000';
const RESERVATION = '550e8400-e29b-41d4-a716-446655440001';

type Layer = { route?: { path: string; methods: Record<string, boolean> } };
function hasRoute(router: unknown, method: string, path: string): boolean {
  return ((router as { stack: Layer[] }).stack ?? []).some(
    (layer) => layer.route?.path === path && layer.route.methods[method.toLowerCase()],
  );
}

async function run(handler: typeof deployEscrowHandler, body: Record<string, unknown>) {
  const res = mockRes() as ReturnType<typeof mockRes> & { _status: number | null; _body: Record<string, unknown> };
  const next = mockNext() as ((err?: unknown) => void) & { error?: unknown };
  await handler({ body, user: { uid: 'guest-uid' } } as never, res as never, next as never);
  if (next.error) throw next.error;
  return res;
}

/** Only the fields the MCP sends for this route, taken from the contract table. */
function mcpRequest(route: keyof typeof API_CONTRACT, values: Record<string, unknown>) {
  const allowed = new Set<string>(API_CONTRACT[route].request);
  for (const key of Object.keys(values)) expect(allowed.has(key), `MCP does not send ${key} to ${route}`).toBe(true);
  return values;
}

describe('MCP ↔ apps/api contract: routes', () => {
  it('mounts every route the MCP calls where the MCP expects it', () => {
    for (const [name, route] of Object.entries(API_CONTRACT)) {
      if (route.mount === '') {
        expect(indexSource, `${name}: app.${route.method.toLowerCase()}('${route.path}')`).toContain(
          `app.${route.method.toLowerCase()}('${route.path}'`,
        );
      } else {
        expect(indexSource, `${name} must be mounted at ${route.mount}`).toMatch(
          new RegExp(`app\\.use\\('${route.mount}', ${route.router}\\)`),
        );
      }
    }
  });

  it('declares deploy, fund and readiness with the method and path the MCP calls', () => {
    expect(hasRoute(deployRouter, API_CONTRACT.deploy.method, API_CONTRACT.deploy.path)).toBe(true);
    expect(hasRoute(fundRouter, API_CONTRACT.fund.method, API_CONTRACT.fund.path)).toBe(true);
    expect(hasRoute(readinessRouter, API_CONTRACT.readiness.method, API_CONTRACT.readiness.path)).toBe(true);
  });
});

describe('MCP ↔ apps/api contract: response shapes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_STELLAR_ADDRESS = PLATFORM;
    process.env.USDC_TRUSTLINE_ADDRESS = 'GISSUER';
    vi.mocked(checkIdempotency).mockResolvedValue({ exists: false } as never);
    vi.mocked(findLiveAction).mockResolvedValue(null);
    vi.mocked(transactionHash).mockReturnValue('tx-hash');
    vi.mocked(transactionExpiry).mockReturnValue(new Date('2030-01-01T00:00:00Z'));
    vi.mocked(insertPendingAction).mockImplementation(async (row: never) => ({
      ...(row as object),
      id: 'pa-1',
      status: 'built',
      created_at: '2030-01-01T00:00:00Z',
      expires_at: '2030-01-01T00:30:00Z',
      submitted_at: null,
      confirmed_at: null,
    }) as never);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({
      status: 'SUCCESS',
      contractId: 'CCONTRACT',
      unsignedTransaction: 'AAAA-XDR',
      unsignedXdr: 'AAAA-XDR',
    } as never);
  });

  it('deploy (apartment) answers every field the MCP reads, and assigns roles as the MCP explains', async () => {
    vi.mocked(getUserWallets).mockResolvedValue([GUEST]);
    vi.mocked(getApartmentEscrowTerms).mockResolvedValue({
      apartmentId: APARTMENT, ownerUserId: 'host-uid', receiverAddress: HOST, amount: 1200,
    });
    const res = await run(deployEscrowHandler, mcpRequest('deploy', { apartmentId: APARTMENT, senderAddress: GUEST }));
    expect(res._status).toBe(200);
    for (const key of API_CONTRACT.deploy.response) expect(res._body, `deploy response lost ${key}`).toHaveProperty(key);

    const [, init] = vi.mocked(trustlessWorkRequest).mock.calls[0] as [string, { body: { roles: Record<string, string> } }];
    const wallet = { guest: GUEST, host: HOST, platform: PLATFORM } as const;
    expect(Object.keys(init.body.roles).sort()).toEqual(Object.keys(DEPLOY_ROLES).sort());
    for (const [role, actor] of Object.entries(DEPLOY_ROLES)) {
      expect(init.body.roles[role], `${role} should be the ${actor} wallet`).toBe(wallet[actor]);
    }
  });

  it('deploy (hotel reservation) accepts the MCP body and answers the same fields', async () => {
    vi.mocked(getHotelReservationEscrowTerms).mockResolvedValue({
      amount: 450, receiverAddress: HOST, senderAddress: GUEST, engagementId: `hotel:${RESERVATION}`, reservation: { id: RESERVATION },
    } as never);
    const res = await run(deployEscrowHandler, mcpRequest('deploy', { reservationId: RESERVATION, senderAddress: GUEST }));
    expect(res._status).toBe(200);
    for (const key of API_CONTRACT.deploy.response) expect(res._body).toHaveProperty(key);
    expect(res._body.engagementId).toBe(`hotel:${RESERVATION}`);
  });

  it('fund answers every field the MCP reads', async () => {
    vi.mocked(authorizeEscrowAction).mockResolvedValue({
      signer: GUEST,
      escrow: { id: 'e1', engagement_id: 'rental:x', contract_id: 'CCONTRACT', sender_address: GUEST, receiver_address: HOST, amount: '1200', status: 'created' },
      roles: rolesFor({ sender_address: GUEST, receiver_address: HOST }, PLATFORM),
    });
    const res = await run(fundEscrowHandler, mcpRequest('fund', { engagementId: 'rental:x' }));
    expect(res._status).toBe(200);
    for (const key of API_CONTRACT.fund.response) expect(res._body, `fund response lost ${key}`).toHaveProperty(key);
  });
});

describe('MCP ↔ apps/api contract: wallet readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearHorizonCache();
    process.env.PLATFORM_STELLAR_ADDRESS = PLATFORM;
    process.env.USDC_TRUSTLINE_ADDRESS = 'GISSUER';
  });

  async function readiness(query: Record<string, string>) {
    const res = mockRes() as ReturnType<typeof mockRes> & { _status: number | null; _body: Record<string, unknown> };
    const next = mockNext() as ((err?: unknown) => void) & { error?: unknown };
    const allowed = new Set<string>(API_CONTRACT.readiness.request);
    for (const key of Object.keys(query)) expect(allowed.has(key), `MCP does not send ${key} to readiness`).toBe(true);
    await getReadinessHandler({ query, user: { uid: 'guest-uid' } } as never, res as never, next as never);
    if (next.error) throw next.error;
    return res;
  }

  it('answers every field get-wallet-readiness reads, including the per-check fixes', async () => {
    vi.mocked(getApartmentEscrowTerms).mockResolvedValue({
      apartmentId: APARTMENT, ownerUserId: 'host-uid', receiverAddress: HOST, amount: 1200,
    });
    vi.mocked(hasuraRequest).mockResolvedValue({ user_wallets: [{ wallet_address: GUEST }] } as never);
    // Guest account exists with XLM but no USDC trustline.
    const loadAccount = vi
      .spyOn(Horizon.Server.prototype, 'loadAccount')
      .mockResolvedValue({ subentry_count: 0, balances: [{ asset_type: 'native', balance: '50.0000000' }] } as never);

    const res = await readiness({ apartmentId: APARTMENT });
    loadAccount.mockRestore();

    expect(res._status).toBe(200);
    for (const key of API_CONTRACT.readiness.response) expect(res._body, `readiness response lost ${key}`).toHaveProperty(key);
    const body = res._body as {
      asset: { code: string }; amount: string;
      guest: { wallet: string; checks: Record<string, { ok: boolean; fix?: string; balance?: string }> };
      counterparties: Record<string, { ok: boolean }>;
    };
    // Fields formatApiReadiness (mcp/src/lib/readiness.ts) reads.
    expect(typeof body.amount).toBe('string');
    expect(body.asset.code).toBe('USDC');
    expect(body.guest.wallet).toBe(GUEST);
    expect(Object.keys(body.guest.checks).sort()).toEqual(
      ['accountExists', 'assetBalance', 'registeredWallet', 'trustline', 'xlmForFees'],
    );
    expect(body.guest.checks.trustline).toMatchObject({ ok: false, fix: 'ADD_TRUSTLINE' });
    expect(Object.keys(body.counterparties).sort()).toEqual(['hostCanReceive', 'platformCanReceive']);
  });

  it('uses only fix codes the MCP can explain', async () => {
    const { FIX_HINTS } = await import('../../../mcp/src/lib/readiness.js');
    const source = readFileSync(join(here, '../src/services/wallet-readiness.ts'), 'utf8');
    const codes = new Set([...source.matchAll(/fix: '([A-Z_]+)'/g)].map((m) => m[1]));
    expect(codes.size).toBeGreaterThan(0);
    for (const code of codes) expect(FIX_HINTS, `MCP has no hint for fix ${code}`).toHaveProperty(code);
  });
});

describe('MCP ↔ apps/api contract: who signs what', () => {
  it('the MCP explains the same signing role for every action as escrow-authz enforces', () => {
    expect(ACTION_SIGNER_ROLE).toEqual(ACTION_ROLE);
  });
});
