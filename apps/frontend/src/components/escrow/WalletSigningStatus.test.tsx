// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));

import { WalletRejectedError } from '@/lib/wallet/errors';
import { WalletSigningStatus } from './WalletSigningStatus';

afterEach(cleanup);

function expectLiveRegion() {
  const region = screen.getByRole('status');
  expect(region.getAttribute('role')).toBe('status');
  expect(region.getAttribute('aria-live')).toBe('polite');
  return region;
}

describe('WalletSigningStatus', () => {
  it('renders nothing while idle', () => {
    const { container } = render(<WalletSigningStatus phase="idle" action="Releasing funds" onRetry={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the preparing state', () => {
    render(<WalletSigningStatus phase="building" action="Releasing funds" onRetry={vi.fn()} />);
    const region = expectLiveRegion();
    expect(region.textContent).toContain('Releasing funds: Preparing…');
    expect(region.textContent).toContain('Step 1 of 3');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the waiting-for-signature state', () => {
    render(<WalletSigningStatus phase="signing" action="Releasing funds" onRetry={vi.fn()} />);
    const region = expectLiveRegion();
    expect(region.textContent).toContain('Releasing funds: Confirm in your wallet');
    expect(region.textContent).toContain('Approve the transaction in your wallet to continue.');
    expect(region.textContent).toContain('Step 2 of 3');
  });

  it('shows the submitting state', () => {
    render(<WalletSigningStatus phase="submitting" action="Releasing funds" onRetry={vi.fn()} />);
    const region = expectLiveRegion();
    expect(region.textContent).toContain('Releasing funds: Submitting…');
    expect(region.textContent).toContain('Step 3 of 3');
  });

  it('shows the done state', () => {
    render(<WalletSigningStatus phase="done" action="Releasing funds" onRetry={vi.fn()} />);
    const region = expectLiveRegion();
    expect(region.textContent).toContain('Releasing funds: Done');
    expect(region.textContent).toContain('The transaction went through.');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the failed state with a plain-language error', () => {
    render(
      <WalletSigningStatus phase="failed" action="Releasing funds" error={new WalletRejectedError()} onRetry={vi.fn()} />,
    );
    const region = expectLiveRegion();
    expect(region.textContent).toContain('Releasing funds: Failed');
    expect(region.textContent).toContain('You cancelled the signature.');
    // The raw error message never reaches the screen.
    expect(region.textContent).not.toContain('Signature cancelled');
  });

  it('labels every state with text and hides the decorative icon', () => {
    const { container } = render(<WalletSigningStatus phase="signing" action="Funding escrow" onRetry={vi.fn()} />);
    const icon = container.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  describe('on failure', () => {
    it('moves focus to the retry button', () => {
      render(<WalletSigningStatus phase="failed" action="Releasing funds" onRetry={vi.fn()} />);
      const retry = screen.getByRole('button', { name: 'Try again' });
      expect(document.activeElement).toBe(retry);
    });

    it('moves focus to retry when an in-progress attempt fails', () => {
      const { rerender } = render(<WalletSigningStatus phase="signing" action="Releasing funds" onRetry={vi.fn()} />);
      expect(screen.queryByRole('button')).toBeNull();
      rerender(<WalletSigningStatus phase="failed" action="Releasing funds" onRetry={vi.fn()} />);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' }));
    });

    it('calls onRetry when clicked', async () => {
      const onRetry = vi.fn();
      render(<WalletSigningStatus phase="failed" action="Releasing funds" onRetry={onRetry} />);
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry from the keyboard (Enter and Space)', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      render(<WalletSigningStatus phase="failed" action="Releasing funds" onRetry={onRetry} />);
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('is reachable with Tab', async () => {
      const user = userEvent.setup();
      render(<WalletSigningStatus phase="failed" action="Releasing funds" onRetry={vi.fn()} />);
      (document.activeElement as HTMLElement | null)?.blur();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' }));
    });
  });
});
