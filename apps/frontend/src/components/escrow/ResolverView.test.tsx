/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ResolverView } from './ResolverView';

describe('ResolverView', () => {
  const mockOnResolve = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders dispute information and split inputs', () => {
    render(
      <ResolverView
        escrowBalance={1000}
        approverAddress="GUEST_ADDR_1234567890"
        receiverAddress="HOST_ADDR_1234567890"
        disputeReason="Property not as described"
        disputeDescription="Broken AC and furniture damaged."
        onResolve={mockOnResolve}
      />,
    );

    expect(screen.getByText('Dispute Resolution Panel')).toBeDefined();
    expect(screen.getByTestId('resolver-dispute-reason').textContent).toBe('Property not as described');
    expect(screen.getByTestId('resolver-dispute-description').textContent).toBe('Broken AC and furniture damaged.');

    expect(screen.getByLabelText(/Guest Allocation \(Approver\)/i)).toBeDefined();
    expect(screen.getByLabelText(/Host Allocation \(Service Provider\)/i)).toBeDefined();
    expect(screen.getByTestId('escrow-balance-total').textContent).toContain('1,000.00 USDC');
  });

  it('blocks submit when sum does not equal escrow balance', () => {
    render(
      <ResolverView
        escrowBalance={1000}
        onResolve={mockOnResolve}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Submit Dispute Resolution/i }) as HTMLButtonElement;
    // Initial: 0 + 0 !== 1000, so blocked
    expect(submitBtn.disabled).toBe(true);

    const guestInput = screen.getByLabelText(/Guest Allocation \(Approver\)/i);
    const hostInput = screen.getByLabelText(/Host Allocation \(Service Provider\)/i);

    // Enter partial amount: 400 + 500 = 900 !== 1000
    fireEvent.change(guestInput, { target: { value: '400' } });
    fireEvent.change(hostInput, { target: { value: '500' } });

    expect(screen.getByTestId('total-allocated').textContent).toContain('900.00 USDC');
    expect(screen.getByTestId('remaining-amount').textContent).toContain('100.00 USDC');
    expect(submitBtn.disabled).toBe(true);
    expect(screen.getByText(/Submitting is blocked: 100.0000000 USDC remaining/i)).toBeDefined();

    // Enter excess amount: 600 + 500 = 1100 > 1000
    fireEvent.change(guestInput, { target: { value: '600' } });
    expect(submitBtn.disabled).toBe(true);
    expect(screen.getByText(/Submitting is blocked: allocation exceeds/i)).toBeDefined();
  });

  it('enables submit when split equals balance exactly (including 7-decimal case) and submits', () => {
    const total = 100.1234567;
    render(
      <ResolverView
        escrowBalance={total}
        onResolve={mockOnResolve}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Submit Dispute Resolution/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const guestInput = screen.getByLabelText(/Guest Allocation \(Approver\)/i);
    const hostInput = screen.getByLabelText(/Host Allocation \(Service Provider\)/i);

    // Exact 7-decimal split: 40.123456 + 60.0000007 = 100.1234567
    fireEvent.change(guestInput, { target: { value: '40.123456' } });
    fireEvent.change(hostInput, { target: { value: '60.0000007' } });

    expect(submitBtn.disabled).toBe(false);
    expect(screen.getByText(/Split is balanced exactly to the escrow balance/i)).toBeDefined();

    fireEvent.click(submitBtn);
    expect(mockOnResolve).toHaveBeenCalledWith([
      { role: 'approver', amount: 40.123456 },
      { role: 'serviceProvider', amount: 60.0000007 },
    ]);
  });

  it('supports quick split preset buttons', () => {
    render(
      <ResolverView
        escrowBalance={500}
        onResolve={mockOnResolve}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Submit Dispute Resolution/i }) as HTMLButtonElement;

    // Click 50% / 50%
    fireEvent.click(screen.getByText('50% / 50%'));
    const guestInput = screen.getByLabelText(/Guest Allocation \(Approver\)/i) as HTMLInputElement;
    const hostInput = screen.getByLabelText(/Host Allocation \(Service Provider\)/i) as HTMLInputElement;

    expect(guestInput.value).toBe('250');
    expect(hostInput.value).toBe('250');
    expect(submitBtn.disabled).toBe(false);

    // Click 100% Guest
    fireEvent.click(screen.getByText('100% Guest / 0% Host'));
    expect(guestInput.value).toBe('500');
    expect(hostInput.value).toBe('0');
    expect(submitBtn.disabled).toBe(false);
  });
});
