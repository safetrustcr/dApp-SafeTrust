// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ push: vi.fn(), post: vi.fn(), sign: vi.fn(), connect: vi.fn(), ready: true, address: `G${'A'.repeat(55)}` }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/api/escrow', () => ({ postEscrowApi: mocks.post }));
vi.mock('@/hooks/use-active-wallet', () => ({ useActiveWallet: () => ({ address: mocks.address, isReady: mocks.ready, signAndSubmit: mocks.sign }) }));
vi.mock('@/components/auth/wallet/hooks/multi-wallet.hook', () => ({ useMultiWallet: () => ({ handleConnect: mocks.connect }) }));
vi.mock('@/components/auth/wallet/components/MainWalletSelectionModal', () => ({ MainWalletSelectionModal: () => null }));
vi.mock('@/components/auth/wallet/components/WalletSelectionModal', () => ({ WalletSelectionModal: () => null }));
import { EscrowPayFlow } from './EscrowPayFlow';
const HOST = `G${'B'.repeat(55)}`;
const props = { apartmentId: 'reservation', apartmentName: 'Hotel', ownerAddress: HOST, amount: 240, bookingKind: 'hotel-room' as const };
beforeEach(() => { vi.clearAllMocks(); mocks.ready = true; mocks.address = `G${'A'.repeat(55)}`; });
afterEach(cleanup);
describe('shared hotel payment flow', () => {
  it('deploys by reservation ID, then signs and opens the shared hotel lifecycle', async () => {
    mocks.post.mockResolvedValue({ engagementId: 'hotel:reservation', contractId: 'CONTRACT', unsignedXDR: 'unsigned' });
    mocks.sign.mockResolvedValue({});
    render(<EscrowPayFlow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create escrow' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/escrow/deploy', { reservationId: 'reservation', senderAddress: mocks.address }, expect.any(Object)));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign & Send' }));
    await waitFor(() => expect(mocks.sign).toHaveBeenCalledWith('unsigned', expect.objectContaining({ action: 'initialize' })));
    expect(mocks.push).toHaveBeenCalledWith('/escrow/reservation/escrow/hotel%3Areservation?kind=hotel-room');
  });
  it('opens an existing escrow without signing an empty cached XDR', async () => {
    mocks.post.mockResolvedValue({ cached: true, engagementId: 'hotel:reservation', unsignedXDR: '' });
    render(<EscrowPayFlow {...props} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it('does not deploy when a different reservation wallet is connected', () => {
    render(<EscrowPayFlow {...props} expectedSenderAddress={HOST} />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('Switch to the wallet');
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('allows wallet connection while signed out of the wallet', () => {
    mocks.ready = false;
    render(<EscrowPayFlow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
