// @vitest-environment jsdom
/**
 * EscrowDetailView runs every escrow action through the real useEscrowAction
 * hook and reports progress with WalletSigningStatus. Only the network
 * (fetch), the wallet signer and the escrow data source are mocked.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ADDRESS = `G${'A'.repeat(55)}`;
const SENDER = `G${'S'.repeat(55)}`;
const RECEIVER = `G${'R'.repeat(55)}`;

const mocks = vi.hoisted(() => ({
  signXDR: vi.fn<(xdr: string, passphrase?: string) => Promise<string>>(),
  refetch: vi.fn(async () => ({})),
  data: null as unknown,
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'token-abc' } },
}));
vi.mock('@/components/auth/wallet/hooks/wallet.hook', () => ({
  useWallet: () => ({ signXDR: mocks.signXDR }),
}));
vi.mock('@/hooks/use-active-wallet', () => ({
  useActiveWallet: () => ({ address: ADDRESS, walletType: 'freighter', isReady: true }),
}));
vi.mock('@apollo/client', () => ({
  useQuery: () => ({ data: mocks.data, loading: false, error: undefined, refetch: mocks.refetch }),
}));
vi.mock('@/graphql/queries/escrow-queries', () => ({ GET_ESCROW_BY_ANY_ID: {} }));
vi.mock('@/hooks/use-hotel-escrow-resource', () => ({
  useHotelEscrowResource: () => ({ data: undefined, loading: false, error: undefined, refetch: vi.fn() }),
}));
vi.mock('@/hooks/use-escrow-stream', () => ({ useEscrowStream: () => ({ streamData: null }) }));
vi.mock('@/components/ui/image', () => ({ default: () => null, Image: () => null }));
vi.mock('@/components/escrow/PdfExportButton', () => ({ PdfExportButton: () => null }));
vi.mock('@/components/escrow/views/EscrowPendingView', () => ({ EscrowPendingView: () => null }));
vi.mock('@/components/escrow/views/EscrowStatusView', () => ({ EscrowStatusView: () => null }));

import EscrowDetailView from './EscrowDetailView';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function escrowData(status: string, roles: Record<string, string>) {
  return {
    escrows: [
      {
        id: 'escrow-1',
        contract_id: 'CONTRACT',
        engagement_id: 'eng-1',
        amount: 100,
        status,
        sender_address: SENDER,
        receiver_address: RECEIVER,
        apartment: { id: 'apt-1', name: 'Flat', owner: null },
      },
    ],
    trustlessWorkEscrows: [{ ...roles, milestones: [{ milestoneId: 'check_in', status: 'pending' }] }],
  };
}

const params = { id: 'apt-1', escrowId: 'eng-1' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signXDR.mockResolvedValue('SIGNED_XDR');
  fetchMock.mockImplementation(async (url: string) =>
    String(url).includes('/send-transaction')
      ? jsonResponse({ txHash: 'hash-1', status: 'submitted' })
      : jsonResponse({ unsignedXdr: 'XDR-1', networkPassphrase: 'Test SDF Network ; September 2015' }),
  );
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('EscrowDetailView signing status', () => {
  it('resolves a dispute through useEscrowAction and shows WalletSigningStatus', async () => {
    mocks.data = escrowData('disputed', { resolver: ADDRESS });
    let releaseSignature!: (signed: string) => void;
    mocks.signXDR.mockImplementationOnce(
      () => new Promise<string>((resolve) => { releaseSignature = resolve; }),
    );

    render(<EscrowDetailView params={params} />);
    fireEvent.change(screen.getByLabelText('Approver funds'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Receiver funds'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve Dispute' }));

    const status = await screen.findByRole('status');
    await waitFor(() => expect(status.textContent).toContain('Resolving dispute: Confirm in your wallet'));
    expect(status.getAttribute('aria-live')).toBe('polite');

    // Build request: same route and body as before, now with an Idempotency-Key.
    const [buildUrl, buildInit] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(buildUrl).toContain('/api/escrow/resolve-dispute');
    expect(buildInit.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(buildInit.body)).toEqual({
      contractId: 'CONTRACT',
      engagementId: 'eng-1',
      disputeResolver: ADDRESS,
      distributions: [
        { address: SENDER, amount: 60 },
        { address: RECEIVER, amount: 40 },
      ],
    });
    expect(mocks.signXDR).toHaveBeenCalledWith('XDR-1', 'Test SDF Network ; September 2015');

    await act(async () => releaseSignature('SIGNED_XDR'));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Resolving dispute: Done'));
    const [submitUrl, submitInit] = fetchMock.mock.calls[1] as [string, { body: string }];
    expect(submitUrl).toContain('/api/escrow/send-transaction');
    expect(JSON.parse(submitInit.body)).toMatchObject({ signedXdr: 'SIGNED_XDR', action: 'resolve_dispute' });
  });

  it('shows the cancelled-signature message, focuses retry, and retries without a second build', async () => {
    mocks.data = escrowData('created', { approver: ADDRESS });
    const { WalletRejectedError } = await import('@/lib/wallet/errors');
    mocks.signXDR.mockRejectedValueOnce(new WalletRejectedError());

    render(<EscrowDetailView params={params} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fund Escrow' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('You cancelled the signature.'));
    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(document.activeElement).toBe(retry);

    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Funding escrow: Done'));

    const buildCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/escrow/fund'));
    expect(buildCalls).toHaveLength(1);
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it('retries a dispute resolution with the current split, not the cancelled one', async () => {
    mocks.data = escrowData('disputed', { resolver: ADDRESS });
    const { WalletRejectedError } = await import('@/lib/wallet/errors');
    mocks.signXDR.mockRejectedValueOnce(new WalletRejectedError());

    render(<EscrowDetailView params={params} />);
    fireEvent.change(screen.getByLabelText('Approver funds'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Receiver funds'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve Dispute' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('You cancelled the signature.'));

    // Change the split, then retry: the new 20/80 split is built and signed.
    fireEvent.change(screen.getByLabelText('Approver funds'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Receiver funds'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Resolving dispute: Done'));

    const builds = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/escrow/resolve-dispute')) as [
      string,
      { headers: Record<string, string>; body: string },
    ][];
    expect(builds).toHaveLength(2);
    expect(JSON.parse(builds[1][1].body).distributions).toEqual([
      { address: SENDER, amount: 20 },
      { address: RECEIVER, amount: 80 },
    ]);
    expect(builds[1][1].headers['Idempotency-Key']).not.toBe(builds[0][1].headers['Idempotency-Key']);
  });

  it('retries an unchanged dispute resolution without a second build', async () => {
    mocks.data = escrowData('disputed', { resolver: ADDRESS });
    const { WalletRejectedError } = await import('@/lib/wallet/errors');
    mocks.signXDR.mockRejectedValueOnce(new WalletRejectedError());

    render(<EscrowDetailView params={params} />);
    fireEvent.change(screen.getByLabelText('Approver funds'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Receiver funds'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve Dispute' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('You cancelled the signature.'));

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Resolving dispute: Done'));

    const builds = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/escrow/resolve-dispute'));
    expect(builds).toHaveLength(1);
    expect(mocks.signXDR).toHaveBeenCalledTimes(2);
  });

  it('shows the conflict message on a 409 and refetches the escrow', async () => {
    mocks.data = escrowData('created', { approver: ADDRESS });
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/send-transaction')
        ? jsonResponse({ error: 'Escrow changed. Refresh and retry' }, 409)
        : jsonResponse({ unsignedXdr: 'XDR-1' }),
    );

    render(<EscrowDetailView params={params} />);
    expect(mocks.refetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Fund Escrow' }));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('The escrow changed. Showing the latest status.'),
    );
    expect(screen.getByRole('status').textContent).not.toContain('Refresh and retry');
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
  });
});
