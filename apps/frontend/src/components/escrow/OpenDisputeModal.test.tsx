/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OpenDisputeModal } from './OpenDisputeModal';

describe('OpenDisputeModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <OpenDisputeModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dispute form step with reason select and character counter', () => {
    render(
      <OpenDisputeModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        escrowAmount={2500}
      />,
    );

    expect(screen.getByText('Open an Escrow Dispute')).toBeDefined();
    expect(screen.getByRole('combobox')).toBeDefined();
    expect(screen.getByPlaceholderText(/Provide details about the issue/i)).toBeDefined();
    expect(screen.getByText('0 / 500')).toBeDefined();

    // Submit button should be disabled initially
    const continueBtn = screen.getByText('Continue to Review');
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows custom reason input when "Other" is selected', () => {
    render(
      <OpenDisputeModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Other' } });

    expect(screen.getByPlaceholderText('Enter specific reason...')).toBeDefined();
    const continueBtn = screen.getByText('Continue to Review');
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Enter specific reason...'), {
      target: { value: 'Custom unexpected damage' },
    });
    expect((continueBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('updates character counter live and enforces 500 characters max', () => {
    render(
      <OpenDisputeModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Provide details about the issue/i) as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(500);

    fireEvent.change(textarea, { target: { value: 'Hello world dispute' } });
    expect(screen.getByText('19 / 500')).toBeDefined();
  });

  it('navigates to confirmation step, explains fund lock, and submits', async () => {
    render(
      <OpenDisputeModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        escrowAmount={1200}
      />,
    );

    // Fill form
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Property not as described' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Provide details about the issue/i), {
      target: { value: 'No hot water and broken window.' },
    });

    const continueBtn = screen.getByText('Continue to Review');
    expect((continueBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(continueBtn);

    // In confirmation step
    expect(screen.getByText('Confirm Dispute Submission')).toBeDefined();
    expect(screen.getByText('Important Notice: Escrow Lock')).toBeDefined();
    expect(
      screen.getByText(/funds.*will remain locked in the Trustless Work smart contract/i),
    ).toBeDefined();
    expect(screen.getByText('Property not as described')).toBeDefined();
    expect(screen.getByText('No hot water and broken window.')).toBeDefined();

    // Confirm button disabled until acknowledged
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Open Dispute/i });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);

    // Check acknowledgment
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);

    // Submit
    fireEvent.click(confirmBtn);
    expect(mockOnSubmit).toHaveBeenCalledWith({
      reason: 'Property not as described',
      description: 'No hot water and broken window.',
    });
  });
});
