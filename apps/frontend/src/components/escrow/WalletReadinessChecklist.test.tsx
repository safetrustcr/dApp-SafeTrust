// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletReadinessChecklist } from './WalletReadinessChecklist';

const mockReadiness = vi.hoisted(() => vi.fn());
const mockBuildTrustline = vi.hoisted(() => vi.fn());
const mockPostAuth = vi.hoisted(() => vi.fn());
const mockSign = vi.hoisted(() => vi.fn());

vi.mock('@/lib/wallet/use-wallet-bridge', async () => {
  const errors = await import('@/lib/wallet/errors');
  return { ...errors, useWalletBridge: () => ({ address: mockWallet.address, sign: mockSign }) };
});

vi.mock('@/lib/api/escrow', () => ({
  getReadiness: mockReadiness,
  buildTrustlineXdr: mockBuildTrustline,
}));

vi.mock('@/lib/api/client', () => ({
  postAuthenticatedApi: mockPostAuth,
}));

const mockWallet = vi.hoisted(() => ({
  address: `G${'A'.repeat(55)}`,
  isReady: true,
}));

vi.mock('@/hooks/use-active-wallet', () => ({
  useActiveWallet: () => mockWallet,
}));

vi.mock('@/components/auth/wallet/hooks/multi-wallet.hook', () => ({
  useMultiWallet: () => ({ handleConnect: vi.fn() }),
}));

vi.mock('@/core/store/data', () => ({
  useGlobalAuthenticationStore: (selector: any) =>
    selector({ stellarWalletId: 'freighter', address: mockWallet.address }),
}));

const GUEST = `G${'A'.repeat(55)}`;
const HOST = `G${'B'.repeat(55)}`;
const ISSUER = `G${'C'.repeat(55)}`;

describe('WalletReadinessChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet.address = GUEST;
    mockWallet.isReady = true;
    mockSign.mockReset();
    mockSign.mockResolvedValue('SIGNED_TRUSTLINE');
  });

  afterEach(cleanup);

  function needsTrustline() {
    mockReadiness.mockResolvedValue({
      ready: false, network: 'testnet', asset: { code: 'USDC', issuer: ISSUER }, amount: '150',
      guest: { wallet: GUEST, checks: {
        registeredWallet: { ok: true }, accountExists: { ok: true },
        xlmForFees: { ok: true }, trustline: { ok: false, fix: 'ADD_TRUSTLINE' },
        assetBalance: { ok: true },
      } },
      counterparties: { hostCanReceive: { ok: true }, platformCanReceive: { ok: true } },
    });
    mockBuildTrustline.mockResolvedValue({ unsignedXdr: 'UNSIGNED_TRUSTLINE' });
  }

  it('signs trustlines through the bridge and submits the signed XDR only to Horizon', async () => {
    needsTrustline();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    render(<WalletReadinessChecklist apartmentId="apt-1" />);
    fireEvent.click(await screen.findByText('Add USDC trustline'));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(mockSign).toHaveBeenCalledWith('UNSIGNED_TRUSTLINE');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://horizon-testnet.stellar.org/transactions',
      expect.objectContaining({ method: 'POST', body: 'tx=SIGNED_TRUSTLINE' }),
    );
    expect(mockPostAuth).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows the explicit Pollar message and never submits an unsupported signature', async () => {
    needsTrustline();
    const { PollarSigningUnsupportedError } = await import('@/lib/wallet/errors');
    mockSign.mockRejectedValue(new PollarSigningUnsupportedError());
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<WalletReadinessChecklist apartmentId="apt-1" />);
    fireEvent.click(await screen.findByText('Add USDC trustline'));
    await screen.findByText("Signing with Pollar isn't available yet. Connect Freighter to sign this transaction.");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows cancellation without submitting a trustline', async () => {
    needsTrustline();
    const { WalletRejectedError } = await import('@/lib/wallet/errors');
    mockSign.mockRejectedValue(new WalletRejectedError());
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<WalletReadinessChecklist apartmentId="apt-1" />);
    fireEvent.click(await screen.findByText('Add USDC trustline'));
    await screen.findByText('Trustline transaction signing was cancelled.');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('renders loading state initially', () => {
    mockReadiness.mockReturnValue(new Promise(() => {}));
    render(<WalletReadinessChecklist apartmentId="apt-1" />);
    expect(screen.getByText('Checking wallet readiness…')).toBeTruthy();
  });

  it('renders error state on API failure without showing raw errors', async () => {
    mockReadiness.mockRejectedValue(new Error('Internal Server Error 500'));
    render(<WalletReadinessChecklist apartmentId="apt-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("Can't check your wallet right now. Try again."),
      ).toBeTruthy();
    });
  });

  it('renders checks with fix buttons when keypair requires setup', async () => {
    mockReadiness.mockResolvedValue({
      ready: false,
      network: 'testnet',
      asset: { code: 'USDC', issuer: ISSUER },
      amount: '150.0000000',
      guest: {
        wallet: GUEST,
        checks: {
          registeredWallet: { ok: true },
          accountExists: { ok: true },
          xlmForFees: { ok: false, balance: '1.0', fix: 'FUND_XLM' },
          trustline: { ok: false, fix: 'ADD_TRUSTLINE' },
          assetBalance: { ok: false, balance: '0', required: '150.0000000', fix: 'GET_TEST_USDC' },
        },
      },
      counterparties: {
        hostCanReceive: { ok: true },
        platformCanReceive: { ok: true },
      },
    });

    render(<WalletReadinessChecklist apartmentId="apt-1" />);

    await waitFor(() => {
      expect(screen.getByText('Setup Required')).toBeTruthy();
      expect(screen.getByText('Fund with Friendbot')).toBeTruthy();
      expect(screen.getByText('Add USDC trustline')).toBeTruthy();
      expect(screen.getByText('Get test USDC')).toBeTruthy();
    });
  });

  it('renders blocked host message with Message host link when host cannot receive', async () => {
    mockReadiness.mockResolvedValue({
      ready: false,
      network: 'testnet',
      asset: { code: 'USDC', issuer: ISSUER },
      amount: '150.0000000',
      guest: {
        wallet: GUEST,
        checks: {
          registeredWallet: { ok: true },
          accountExists: { ok: true },
          xlmForFees: { ok: true, balance: '50.0' },
          trustline: { ok: true },
          assetBalance: { ok: true, balance: '200.0', required: '150.0000000' },
        },
      },
      counterparties: {
        hostCanReceive: { ok: false },
        platformCanReceive: { ok: true },
      },
    });

    render(<WalletReadinessChecklist apartmentId="apt-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("The host hasn't finished wallet setup yet."),
      ).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Message host' })).toBeTruthy();
    });
  });

  it('calls onReadyChange(true) when ready === true', async () => {
    const onReadyChange = vi.fn();
    mockReadiness.mockResolvedValue({
      ready: true,
      network: 'testnet',
      asset: { code: 'USDC', issuer: ISSUER },
      amount: '150.0000000',
      guest: {
        wallet: GUEST,
        checks: {
          registeredWallet: { ok: true },
          accountExists: { ok: true },
          xlmForFees: { ok: true, balance: '50.0' },
          trustline: { ok: true },
          assetBalance: { ok: true, balance: '200.0', required: '150.0000000' },
        },
      },
      counterparties: {
        hostCanReceive: { ok: true },
        platformCanReceive: { ok: true },
      },
    });

    render(<WalletReadinessChecklist apartmentId="apt-1" onReadyChange={onReadyChange} />);

    await waitFor(() => {
      expect(screen.getByText('Ready to Deploy')).toBeTruthy();
      expect(onReadyChange).toHaveBeenCalledWith(true);
    });
  });
});
