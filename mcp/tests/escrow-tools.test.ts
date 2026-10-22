/**
 * Escrow tools against a fake local stack (#531): Hasura, apps/api and
 * Testnet Horizon are answered from fixtures by a stubbed fetch, so these run
 * without Docker.
 *
 *   pnpm --filter @safetrust/mcp test:escrow
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

process.env.HASURA_ADMIN_SECRET ??= 'test-secret';
process.env.HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
process.env.SAFETRUST_API_URL = 'http://localhost:3002';
process.env.STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';

const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
const { registerEscrowTools } = await import('../src/tools/escrow.js');
const { registerEscrowDiagnosticsTools } = await import('../src/tools/escrow-diagnostics.js');
const { registerApartmentTools } = await import('../src/tools/apartments.js');
const { registerHasuraTools } = await import('../src/tools/hasura.js');
const { registerHealthTools } = await import('../src/tools/health.js');
const { diagnose } = await import('../src/lib/diagnose.js');
const { reservationContext, apartmentContext } = await import('../src/lib/booking.js');

const mcpDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ─────────────────────────────── fixtures ─────────────────────────────── */

const XDR = `AAAAAgAAAAB${'Q'.repeat(120)}AAAAAA==`;
const GUEST = `GGUEST${'A'.repeat(50)}`;
const HOST = `GHOST${'B'.repeat(51)}`;
const ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR2JQTMZ35MIFUQ5IQSQ9CQBZ8JMXKDPE';
const APARTMENT = '11111111-1111-4111-8111-111111111111';
const RESERVATION = '22222222-2222-4222-8222-222222222222';
const NOW = new Date();
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const minutesAhead = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();

const escrowRow = (engagementId: string, status: string, contractId = engagementId) => ({
  id: `e-${engagementId}`,
  contract_id: contractId,
  engagement_id: engagementId,
  status,
  amount: '1200',
  property_id: APARTMENT,
  apartment_id: APARTMENT,
  tenant_id: 'safetrust',
  sender_address: GUEST,
  receiver_address: HOST,
  created_at: minutesAgo(60),
  updated_at: minutesAgo(5),
  // Hasura should never return this (the MCP does not select it) — present so a
  // leak would show up in the output.
  unsigned_xdr: XDR,
});

const pending = (action: string, status: string, txHash: string, extra: Record<string, unknown> = {}) => ({
  id: `p-${txHash}`,
  action,
  status,
  tx_hash: txHash,
  contract_id: null,
  signer_address: GUEST,
  created_at: minutesAgo(3),
  expires_at: minutesAhead(30),
  submitted_at: status === 'built' ? null : minutesAgo(2),
  confirmed_at: null,
  unsigned_xdr: XDR,
  ...extra,
});

/** Three seeded cases from the issue, plus a hotel escrow. */
const CASES: Record<string, { escrow: object | null; pending: object[]; transitions: object[]; chain?: Record<string, object> }> = {
  'rental:built-unsigned': {
    escrow: escrowRow('rental:built-unsigned', 'pending_signature'),
    pending: [pending('initialize', 'built', 'hash-built')],
    transitions: [],
  },
  'rental:submitted-pending': {
    escrow: escrowRow('rental:submitted-pending', 'created', 'CCONTRACTSUBMITTED'),
    pending: [pending('fund', 'submitted', 'hash-submitted')],
    transitions: [
      { action: 'initialize', from_status: 'pending_signature', to_status: 'created', tx_hash: 'hash-init', source: 'submit', created_at: minutesAgo(20) },
    ],
  },
  'rental:confirmed-synced': {
    escrow: escrowRow('rental:confirmed-synced', 'funded', 'CCONTRACTSYNCED'),
    pending: [pending('fund', 'submitted', 'hash-landed')],
    transitions: [
      { action: 'fund', from_status: 'created', to_status: 'funded', tx_hash: 'hash-landed', source: 'submit', created_at: minutesAgo(1) },
    ],
  },
  'rental:confirmed-not-synced': {
    escrow: escrowRow('rental:confirmed-not-synced', 'created', 'CCONTRACTSTUCK'),
    pending: [pending('fund', 'submitted', 'hash-stuck')],
    transitions: [],
  },
  [`hotel:${RESERVATION}`]: {
    escrow: { ...escrowRow(`hotel:${RESERVATION}`, 'funded', 'CHOTEL'), apartment_id: null, property_id: RESERVATION, tenant_id: 'hotel_industry' },
    pending: [],
    transitions: [],
  },
};

const HORIZON_TX: Record<string, object> = {
  'hash-landed': { successful: true, created_at: minutesAgo(1) },
  'hash-stuck': { successful: true, created_at: minutesAgo(8) },
};

const HORIZON_ACCOUNTS: Record<string, object> = {
  [GUEST]: {
    balances: [
      { asset_type: 'native', balance: '50.0000000' },
      { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: ISSUER, balance: '1500.0000000', limit: '922337203685.4775807' },
    ],
  },
  [HOST]: { balances: [{ asset_type: 'native', balance: '20.0000000' }] },
};

/* ─────────────────────────────── fake stack ─────────────────────────────── */

const calls: string[] = [];

function hasura(query: string, variables: Record<string, unknown>): unknown {
  const op = query.match(/query\s+(\w+)/)?.[1] ?? '';
  const engagementId = variables.engagementId as string | undefined;
  const c = engagementId ? CASES[engagementId] : undefined;
  switch (op) {
    case 'McpEscrow': {
      const byContract = Object.values(CASES).find((x) => (x.escrow as { contract_id?: string } | null)?.contract_id === variables.contractId);
      return { escrows: [c?.escrow ?? byContract?.escrow].filter(Boolean) };
    }
    case 'McpPendingActions':
      return { escrow_pending_actions: (c?.pending ?? []).filter((p) => !variables.action || (p as { action: string }).action === variables.action) };
    case 'McpEscrowTransitions':
      return { escrow_transactions: c?.transitions ?? [] };
    case 'McpTwMirror':
      return { trustlessWorkEscrows: [{ status: 'funded', unsignedTransaction: XDR }] };
    case 'McpLastReconcilerWrite':
      return { escrow_transactions: [{ created_at: minutesAgo(90), engagement_id: 'rental:other' }] };
    case 'McpApartmentEscrows':
      return { escrows: [CASES['rental:confirmed-synced'].escrow] };
    case 'McpApartmentTerms':
      return {
        apartments_by_pk: {
          id: APARTMENT, name: 'Sea View Loft', owner_id: 'host-uid', warranty_deposit: '1200', price: '900',
          is_available: true, available_from: '2026-11-01', available_until: '2027-05-01',
        },
      };
    case 'McpOwnerPrimaryWallet':
      return { user_wallets: [{ wallet_address: HOST }] };
    case 'McpHotelReservation':
      return {
        reservations_by_pk: {
          id: RESERVATION, wallet_address: GUEST, reservation_status: 'CONFIRMED', total_amount: '450',
          check_in: '2026-12-01', check_out: '2026-12-04',
          room: { room_number: '204', hotel: { id: 'h1', name: 'Hotel Aurora', owner: { firebase_uid: 'owner-uid', wallets: [{ wallet_address: HOST }] } } },
        },
      };
    case 'McpHotelWalletRegistered':
      return { users_wallets: [{ wallet_address: GUEST }] };
    case 'McpWalletRegistered':
      return { user_wallets: [] };
    default:
      // apartments / query-* / hasura-query: echo something with an XDR in it.
      return {
        apartments: [], escrows: [CASES['rental:built-unsigned'].escrow], trustlessWorkEscrows: [],
        user_wallets: [], escrow_pending_actions: [CASES['rental:built-unsigned'].pending[0]],
      };
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * How the stubbed apps/api answers GET /api/escrow/readiness. Defaults to what
 * it answers today without a signed-in user (#528): 401.
 */
let readinessReply: () => Response = () => json({ error: 'Missing or invalid Authorization header' }, 401);

const API_READY = {
  ready: false,
  network: 'testnet',
  asset: { code: 'USDC', issuer: ISSUER },
  amount: '450.0000000',
  guest: {
    wallet: GUEST,
    checks: {
      registeredWallet: { ok: true },
      accountExists: { ok: true },
      xlmForFees: { ok: true, balance: '20.0000000', required: '2.0000000' },
      trustline: { ok: false, fix: 'ADD_TRUSTLINE' },
      assetBalance: { ok: false, balance: '0', required: '450.0000000', fix: 'GET_TEST_USDC' },
    },
  },
  counterparties: { hostCanReceive: { ok: true }, platformCanReceive: { ok: true } },
};

const realFetch = globalThis.fetch;
before(() => {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    if (url.startsWith('http://localhost:8080/v1/graphql')) {
      const { query, variables } = JSON.parse(String(init?.body));
      return json({ data: hasura(query, variables ?? {}) });
    }
    if (url === 'http://localhost:8080/healthz' || url === 'http://localhost:3002/health') return json({ status: 'ok' });
    if (url === 'http://localhost:3002/api/escrow/deploy') {
      return json({ status: 'SUCCESS', engagementId: `rental:${APARTMENT}:guest-uid`, contractId: 'CNEW', unsignedXDR: XDR });
    }
    if (url.startsWith('http://localhost:3002/api/escrow/readiness?')) return readinessReply();
    if (url === 'http://localhost:3002/api/escrow/fund') {
      return json({ unsignedXdr: XDR, txHash: 'hash-fund', engagementId: 'rental:x', contractId: 'CX', expiresAt: minutesAhead(30), reused: false });
    }
    const tx = url.match(/horizon-testnet\.stellar\.org\/transactions\/(.+)$/);
    if (tx) return HORIZON_TX[tx[1]] ? json(HORIZON_TX[tx[1]]) : json({ status: 404 }, 404);
    const account = url.match(/horizon-testnet\.stellar\.org\/accounts\/(.+)$/);
    if (account) return HORIZON_ACCOUNTS[account[1]] ? json(HORIZON_ACCOUNTS[account[1]]) : json({ status: 404 }, 404);
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  calls.length = 0;
});

/** The same register calls src/server.ts makes, read from its source. */
async function client() {
  const index = readFileSync(join(mcpDir, 'src', 'server.ts'), 'utf8');
  const registrars: Record<string, (s: InstanceType<typeof McpServer>) => void> = {
    registerEscrowTools,
    registerEscrowDiagnosticsTools,
    registerApartmentTools,
    registerHasuraTools,
    registerHealthTools,
  };
  const used = [...index.matchAll(/^\s*(register\w+)\(server\);$/gm)].map((m) => m[1]);
  assert.deepEqual([...used].sort(), Object.keys(registrars).sort(), 'test registrars must match src/server.ts');
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  for (const name of used) registrars[name](server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  const c = new Client({ name: 'escrow-tools-test', version: '0.0.0' }, { capabilities: {} });
  await c.connect(a);
  return c;
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const c = await client();
  const result = await c.callTool({ name, arguments: args });
  await c.close();
  return { text: (result.content as Array<{ text: string }>).map((x) => x.text).join('\n'), isError: Boolean(result.isError) };
}

/* ─────────────────────────────── tests ─────────────────────────────── */

describe('get-booking-context', () => {
  it('describes an apartment deposit from the same data apps/api uses', async () => {
    const { text, isError } = await call('get-booking-context', { apartmentId: APARTMENT });
    assert.equal(isError, false, text);
    assert.match(text, /Apartment: Sea View Loft/);
    assert.match(text, /"amount": 1200/);
    assert.match(text, /"code": "USDC"/);
    assert.match(text, /"hostWallet": "GHOS…BBBB"/);
    assert.match(text, /apps\/api would accept a deploy/);
    assert.match(text, /"status": "funded"/, 'lists the existing escrow');
    assert.ok(!text.includes(HOST), 'host wallet is redacted');
  });

  it('describes a hotel reservation, with its engagement id and guest wallet', async () => {
    const { text, isError } = await call('get-booking-context', { reservationId: RESERVATION });
    assert.equal(isError, false, text);
    assert.match(text, /Hotel reservation: Hotel Aurora · Room 204/);
    assert.match(text, /"amount": 450/);
    assert.match(text, new RegExp(`"engagementId": "hotel:${RESERVATION}"`));
    assert.match(text, /"from": "2026-12-01"/);
    assert.match(text, /"guestWallet": "GGUE…AAAA"/);
    assert.ok(!text.includes(GUEST));
  });

  it('flags what apps/api would refuse, with its error codes', () => {
    const reservation = {
      id: RESERVATION, wallet_address: HOST, reservation_status: 'CANCELLED', total_amount: '0',
      check_in: '2026-12-04', check_out: '2026-12-01',
      room: { room_number: '1', hotel: { id: 'h', name: 'H', owner: { firebase_uid: 'o', wallets: [{ wallet_address: HOST }] } } },
    };
    const codes = reservationContext(reservation, ISSUER)!.blockers.map((b) => b.code).sort();
    assert.deepEqual(codes, ['RESERVATION_AMOUNT_INVALID', 'RESERVATION_DATES_INVALID', 'RESERVATION_NOT_PAYABLE', 'RESERVATION_WALLET_INVALID']);
    const apartment = apartmentContext(APARTMENT, {
      apartment: { id: APARTMENT, name: 'A', owner_id: 'o', warranty_deposit: null, price: null, is_available: true, available_from: null, available_until: null },
      hostWallet: null,
    }, ISSUER)!;
    assert.deepEqual(apartment.blockers.map((b) => b.code), ['APARTMENT_HAS_NO_DEPOSIT', 'HOST_WALLET_MISSING']);
  });

  it('refuses ambiguous input', async () => {
    const { isError } = await call('get-booking-context', { apartmentId: APARTMENT, reservationId: RESERVATION });
    assert.equal(isError, true);
  });
});

describe('diagnose-escrow explains the seeded cases', () => {
  it('built but unsigned', async () => {
    const { text } = await call('diagnose-escrow', { engagementId: 'rental:built-unsigned' });
    assert.match(text, /^Built, not signed: the initialize transaction/);
    assert.match(text, /signs with their wallet/);
    assert.match(text, /state: built-unsigned/);
  });

  it('submitted, not confirmed', async () => {
    const { text } = await call('diagnose-escrow', { engagementId: 'rental:submitted-pending' });
    assert.match(text, /^Submitted, not confirmed yet: fund tx hash-sub/);
    assert.match(text, /Horizon has no record of it yet/);
    assert.match(text, /state: submitted-awaiting-confirmation/);
  });

  it('confirmed and synced', async () => {
    const { text } = await call('diagnose-escrow', { engagementId: 'rental:confirmed-synced' });
    assert.match(text, /^Confirmed and synced: fund landed on chain/);
    assert.match(text, /DB status is funded/);
    assert.match(text, /Next step: The host marks the milestone complete/);
  });

  it('confirmed on chain but the DB lags: points at the reconciler', async () => {
    const { text } = await call('diagnose-escrow', { engagementId: 'rental:confirmed-not-synced' });
    assert.match(text, /^Funded on chain but not in the DB: fund landed \(tx hash-stu…/);
    assert.match(text, /DB is still created/);
    assert.match(text, /reconciler last corrected an escrow at/);
    assert.match(text, /POST \/reconciliation\/sync-escrows/);
  });

  it('a submission Horizon never saw is reported as lost after 10 minutes', () => {
    const result = diagnose({
      engagementId: 'rental:lost',
      escrow: escrowRow('rental:lost', 'created') as never,
      pendingActions: [pending('fund', 'submitted', 'hash-lost', { submitted_at: minutesAgo(25) }) as never],
      transitions: [],
      twMirrorStatus: null,
      chain: { 'hash-lost': { status: 'not_found' } },
      lastReconcilerWrite: null,
      now: NOW,
    });
    assert.equal(result.state, 'submitted-lost');
  });

  it('an expired build is reported as expired, not as waiting', () => {
    const result = diagnose({
      engagementId: 'rental:old',
      escrow: escrowRow('rental:old', 'pending_signature') as never,
      pendingActions: [pending('initialize', 'built', 'hash-old', { expires_at: minutesAgo(1) }) as never],
      transitions: [],
      twMirrorStatus: null,
      chain: {},
      lastReconcilerWrite: null,
      now: NOW,
    });
    assert.equal(result.state, 'build-expired');
  });

  it('no escrow at all', async () => {
    const { text } = await call('diagnose-escrow', { engagementId: 'rental:nothing' });
    assert.match(text, /state: no-escrow/);
  });
});

describe('get-pending-action, get-escrow-status and get-wallet-readiness', () => {
  it('lists pending actions without their XDR', async () => {
    const { text } = await call('get-pending-action', { engagementId: 'rental:built-unsigned' });
    assert.match(text, /"status": "built"/);
    assert.match(text, /"txHash": "hash-built"/);
    assert.match(text, /"expiresAt"/);
  });

  it('get-escrow-status includes transitions and the Trustless Work mirror', async () => {
    const { text } = await call('get-escrow-status', { engagementId: 'rental:submitted-pending' });
    assert.match(text, /"to_status": "created"/);
    assert.match(text, /"trustlessWorkMirrorStatus": "funded"/);
  });

  it('readiness reports each check with a fix', async () => {
    const { text } = await call('get-wallet-readiness', { reservationId: RESERVATION });
    assert.match(text, /^Not ready: 1 check\(s\) fail\./);
    assert.match(text, /✅ guest-usdc-balance: Guest holds 1500 USDC \(needs 450\)/);
    assert.match(text, /❌ host-usdc-trustline/);
    assert.match(text, /fix: Add the USDC trustline/);
  });

  it('readiness for an apartment checks a supplied guest wallet', async () => {
    const { text } = await call('get-wallet-readiness', { apartmentId: APARTMENT, guestAddress: GUEST });
    assert.match(text, /❌ guest-wallet-registered/);
  });
});

describe('get-wallet-readiness asks apps/api first', () => {
  const restore = readinessReply;
  after(() => {
    readinessReply = restore;
  });

  it('reports GET /api/escrow/readiness as apps/api answers it, with fixes and redacted wallets', async () => {
    readinessReply = () => json(API_READY);
    const { text, isError } = await call('get-wallet-readiness', { reservationId: RESERVATION });
    assert.equal(isError, false, text);
    assert.match(text, /^Not ready: apps\/api reports blocking checks\./);
    assert.match(text, /source: GET \/api\/escrow\/readiness \(testnet\)/);
    assert.match(text, /amount: 450\.0000000 USDC/);
    assert.match(text, /✅ guest holds XLM for reserves and fees \(balance 20\.0000000, needs 2\.0000000\)/);
    assert.match(text, /❌ guest has the USDC trustline\n   fix \(ADD_TRUSTLINE\): .*readiness\/trustline/);
    assert.match(text, /❌ guest holds enough USDC \(balance 0, needs 450\.0000000\)\n   fix \(GET_TEST_USDC\)/);
    assert.match(text, /✅ host wallet can receive USDC/);
    assert.ok(!text.includes(GUEST), 'guest wallet must be redacted');
    assert.match(text, /guest wallet: GGUE…AAAA/);
    // The API answered, so the MCP did not run its own Hasura/Horizon checks.
    assert.ok(calls.every((u) => u.startsWith('http://localhost:3002/api/escrow/readiness?')), calls.join('\n'));
    assert.deepEqual(calls, [`http://localhost:3002/api/escrow/readiness?reservationId=${RESERVATION}`]);
  });

  it('shows checks apps/api skipped when no wallet is registered', async () => {
    readinessReply = () =>
      json({
        ...API_READY,
        guest: { wallet: null, checks: { registeredWallet: { ok: false, fix: 'LINK_WALLET' } } },
      });
    const { text } = await call('get-wallet-readiness', { apartmentId: APARTMENT });
    assert.match(text, /guest wallet: \(none registered\)/);
    assert.match(text, /❌ guest wallet registered\n   fix \(LINK_WALLET\)/);
    assert.match(text, /➖ guest account exists on chain: not checked/);
  });

  it('surfaces a real apps/api refusal instead of guessing', async () => {
    readinessReply = () =>
      json(
        {
          type: 'https://api.safetrust.dev/problems/self-escrow-not-allowed',
          title: 'Conflict',
          status: 409,
          detail: 'You cannot create a rental escrow for your own apartment.',
        },
        409,
      );
    const { text, isError } = await call('get-wallet-readiness', { apartmentId: APARTMENT });
    assert.equal(isError, true);
    assert.match(text, /Readiness failed \(HTTP 409 SELF_ESCROW_NOT_ALLOWED\): You cannot create a rental escrow/);
  });

  it('falls back to its own read-only checks, and says so, while it cannot sign in (#528)', async () => {
    readinessReply = restore;
    const { text } = await call('get-wallet-readiness', { reservationId: RESERVATION });
    assert.match(text, /source: MCP read-only checks \(Hasura \+ Testnet Horizon\), not apps\/api — .*HTTP 401.*#528/);
    assert.match(text, /❌ host-usdc-trustline/);
  });

  it('falls back when apps/api is not running', async () => {
    readinessReply = () => {
      throw new TypeError('fetch failed');
    };
    const { text } = await call('get-wallet-readiness', { reservationId: RESERVATION });
    assert.match(text, /source: MCP read-only checks .*Cannot reach apps\/api/);
  });
});

describe('build tools match apps/api', () => {
  it('deploy-escrow sends only the booking and the guest wallet', async () => {
    const seen: unknown[] = [];
    const wrapped = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).endsWith('/api/escrow/deploy')) seen.push(JSON.parse(String(init?.body)));
      return wrapped(input, init);
    }) as typeof fetch;
    try {
      await call('deploy-escrow', { reservationId: RESERVATION, senderAddress: GUEST });
    } finally {
      globalThis.fetch = wrapped;
    }
    assert.deepEqual(seen, [{ reservationId: RESERVATION, senderAddress: GUEST }]);
  });

  it('fund-escrow sends only the engagement id', async () => {
    const { text, isError } = await call('fund-escrow', { engagementId: 'rental:x' });
    assert.equal(isError, false, text);
    assert.match(text, /txHash: hash-fund/);
  });
});

describe('output never carries an XDR, except the build tools', () => {
  const BUILD_TOOLS = new Set(['deploy-escrow', 'fund-escrow']);
  const ARGS: Record<string, Record<string, unknown>> = {
    'get-booking-context': { apartmentId: APARTMENT },
    'get-escrow-status': { engagementId: 'rental:built-unsigned' },
    'get-pending-action': { engagementId: 'rental:built-unsigned' },
    'get-wallet-readiness': { reservationId: RESERVATION },
    'diagnose-escrow': { engagementId: 'rental:built-unsigned' },
    'orchestrate-escrow': { step: 'start', apartmentId: APARTMENT, senderAddress: GUEST },
    'get-apartment': { apartmentId: APARTMENT },
    'list-apartments': {},
    'query-escrows': {},
    'query-trustless-work-escrows': {},
    'query-user-wallets': { walletAddress: GUEST },
    'hasura-query': { query: '{ escrow_pending_actions { unsigned_xdr } }' },
  };

  it('covers every non-build tool', async () => {
    const c = await client();
    const { tools } = await c.listTools();
    await c.close();
    const names = tools.map((t) => t.name).filter((n) => !BUILD_TOOLS.has(n));
    for (const name of names) {
      if (name === 'check-stack-health' || name === 'explain-escrow-roles') continue;
      assert.ok(name in ARGS, `add ${name} to the XDR leak test`);
    }
  });

  for (const [name, args] of Object.entries(ARGS)) {
    it(`${name} withholds unsigned XDRs`, async () => {
      const { text } = await call(name, args);
      assert.ok(!text.includes(XDR.slice(0, 40)), `${name} leaked an XDR:\n${text}`);
    });
  }
});

describe('Trustless Work is reached only through apps/api', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? files(p) : /\.(ts|js|mjs)$/.test(n) ? [p] : [];
    });

  it('no MCP module imports a Trustless Work client or calls its URL', () => {
    const forbidden = [
      /trustlesswork\.com/i,
      /trustless-work\//i,
      /@trustless-work\//i,
      /from\s+['"][^'"]*services\/trustlesswork(\.js)?['"]/,
      /\btrustlessWorkRequest\b/,
      /\/deployer\/single-release/,
      /\/escrow\/single-release\//,
    ];
    for (const file of files(join(mcpDir, 'src'))) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        assert.ok(!pattern.test(text), `${file.slice(mcpDir.length + 1)} matches ${pattern}`);
      }
    }
  });

  it('check-stack-health calls only apps/api and Hasura', async () => {
    await call('check-stack-health');
    assert.deepEqual([...calls].sort(), ['http://localhost:3002/health', 'http://localhost:8080/healthz']);
  });
});
