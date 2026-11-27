// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ProcessStepper,
  formatShortTxHash,
  getActorLabel,
  getExplorerTxUrl,
  getStellarNetwork,
  statusToStep,
  type EscrowTransaction,
} from './ProcessStepper';

const query = vi.hoisted(() => vi.fn());
vi.mock('@apollo/client', async () => ({
  ...(await vi.importActual('@apollo/client')),
  useQuery: query,
}));

describe('ProcessStepper', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  // Construct in the host's local calendar so formatDate always formats as November 24, 2026
  // across UTC and US time zones.
  const sampleDate = new Date(2026, 10, 24, 12, 0, 0).toISOString();
  const sampleTxHash = '4ef13e4f16b2084c718b958c2876a39498d578b80b2a8d67c5e2195f087da23a';

  describe('Every escrow state', () => {
    it('handles state "created": renders correct step labels in order and marks created as current', () => {
      const mockTxs: EscrowTransaction[] = [
        {
          action: 'initialize',
          from_status: null,
          to_status: 'created',
          tx_hash: sampleTxHash,
          actor_uid: 'guest-1',
          created_at: sampleDate,
          source: 'submit',
        },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="created" />,
      );

      const items = container.querySelectorAll('ol > li');
      expect(items).toHaveLength(5);

      const labels = Array.from(items).map(
        (li) => li.querySelector('p')?.textContent,
      );
      expect(labels).toEqual([
        'Escrow created',
        'Payment locked',
        'Stay completed',
        'Approved',
        'Released',
      ]);

      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Escrow created');
    });

    it('handles state "payment locked": renders steps, marks payment locked current, and completed shows date, actor, explorer link', () => {
      const mockTxs: EscrowTransaction[] = [
        {
          action: 'initialize',
          from_status: null,
          to_status: 'created',
          tx_hash: sampleTxHash,
          actor_uid: 'guest-1',
          created_at: sampleDate,
          source: 'submit',
        },
        {
          action: 'fund',
          from_status: 'created',
          to_status: 'funded',
          tx_hash: 'hash-fund-1234567890abcdef',
          actor_uid: 'guest-1',
          created_at: sampleDate,
          source: 'submit',
        },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="payment locked" />,
      );

      const items = container.querySelectorAll('ol > li');
      expect(items).toHaveLength(5);

      const labels = Array.from(items).map(
        (li) => li.querySelector('p')?.textContent,
      );
      expect(labels).toEqual([
        'Escrow created',
        'Payment locked',
        'Stay completed',
        'Approved',
        'Released',
      ]);

      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Payment locked');

      // Completed step (Escrow created) shows date and actor
      const completedStep = items[0];
      expect(completedStep.textContent).toContain('Guest created escrow');
      expect(completedStep.textContent).toContain('November 24, 2026');

      // Explorer link is rendered with correct testnet URL and short hash
      const link = completedStep.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe(
        `https://stellar.expert/explorer/testnet/tx/${sampleTxHash}`,
      );
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link?.textContent).toBe(formatShortTxHash(sampleTxHash));
    });

    it('handles state "stay completed": renders steps and marks stay completed current', () => {
      const mockTxs: EscrowTransaction[] = [
        {
          action: 'initialize',
          from_status: null,
          to_status: 'created',
          tx_hash: 'tx-init',
          actor_uid: 'guest-1',
          created_at: sampleDate,
          source: 'submit',
        },
        {
          action: 'fund',
          from_status: 'created',
          to_status: 'funded',
          tx_hash: 'tx-fund',
          actor_uid: 'guest-1',
          created_at: sampleDate,
          source: 'submit',
        },
        {
          action: 'mark_milestone_completed',
          from_status: 'pending',
          to_status: 'completed',
          tx_hash: 'tx-stay',
          actor_uid: 'host-1',
          created_at: sampleDate,
          source: 'submit',
        },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="stay completed" />,
      );

      const items = container.querySelectorAll('ol > li');
      expect(items).toHaveLength(5);
      const labels = Array.from(items).map(
        (li) => li.querySelector('p')?.textContent,
      );
      expect(labels).toEqual([
        'Escrow created',
        'Payment locked',
        'Stay completed',
        'Approved',
        'Released',
      ]);

      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Stay completed');

      // Completed steps show date and actor
      expect(items[0].textContent).toContain('Guest created escrow');
      expect(items[1].textContent).toContain('Guest paid deposit');
    });

    it('handles state "approved": renders steps and marks approved current', () => {
      const mockTxs: EscrowTransaction[] = [
        {
          action: 'initialize',
          created_at: sampleDate,
          source: 'submit',
        },
        {
          action: 'fund',
          created_at: sampleDate,
          source: 'submit',
        },
        {
          action: 'mark_milestone_completed',
          created_at: sampleDate,
          source: 'submit',
        },
        {
          action: 'approve_milestone',
          created_at: sampleDate,
          source: 'submit',
        },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="approved" />,
      );

      const items = container.querySelectorAll('ol > li');
      expect(items).toHaveLength(5);
      const labels = Array.from(items).map(
        (li) => li.querySelector('p')?.textContent,
      );
      expect(labels).toEqual([
        'Escrow created',
        'Payment locked',
        'Stay completed',
        'Approved',
        'Released',
      ]);

      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Approved');

      // Completed steps show date and actor
      expect(items[2].textContent).toContain('Host marked the stay completed');
    });

    it('handles state "released": renders steps and marks released current', () => {
      const mockTxs: EscrowTransaction[] = [
        { action: 'initialize', created_at: sampleDate, source: 'submit' },
        { action: 'fund', created_at: sampleDate, source: 'submit' },
        { action: 'mark_milestone_completed', created_at: sampleDate, source: 'submit' },
        { action: 'approve_milestone', created_at: sampleDate, source: 'submit' },
        { action: 'release_funds', created_at: sampleDate, source: 'submit' },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="released" />,
      );

      const items = container.querySelectorAll('ol > li');
      expect(items).toHaveLength(5);
      const labels = Array.from(items).map(
        (li) => li.querySelector('p')?.textContent,
      );
      expect(labels).toEqual([
        'Escrow created',
        'Payment locked',
        'Stay completed',
        'Approved',
        'Released',
      ]);

      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Released');

      // Completed step approved shows actor
      expect(items[3].textContent).toContain('Guest approved release');
    });

    it('handles state "disputed": renders dispute branch and marks disputed current', () => {
      const mockTxs: EscrowTransaction[] = [
        { action: 'initialize', created_at: sampleDate, source: 'submit' },
        { action: 'fund', created_at: sampleDate, source: 'submit' },
        { action: 'dispute', created_at: sampleDate, source: 'submit' },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="disputed" />,
      );

      const items = container.querySelectorAll('ol > li');
      expect(items).toHaveLength(4);
      const labels = Array.from(items).map(
        (li) => li.querySelector('p')?.textContent,
      );
      expect(labels).toEqual([
        'Escrow created',
        'Payment locked',
        'Disputed',
        'Resolved',
      ]);

      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Disputed');

      // Completed steps show date and actor
      expect(items[0].textContent).toContain('Guest created escrow');
      expect(items[1].textContent).toContain('Guest paid deposit');
    });

    it('handles state "resolved": renders dispute branch and marks resolved current', () => {
      const mockTxs: EscrowTransaction[] = [
        { action: 'initialize', created_at: sampleDate, source: 'submit' },
        { action: 'fund', created_at: sampleDate, source: 'submit' },
        { action: 'dispute', created_at: sampleDate, source: 'submit' },
        { action: 'resolve_dispute', created_at: sampleDate, source: 'submit' },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="resolved" />,
      );

      const items = container.querySelectorAll('ol > li');
      expect(items).toHaveLength(4);
      const labels = Array.from(items).map(
        (li) => li.querySelector('p')?.textContent,
      );
      expect(labels).toEqual([
        'Escrow created',
        'Payment locked',
        'Disputed',
        'Resolved',
      ]);

      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Resolved');

      // Disputed completed step shows actor
      expect(items[2].textContent).toContain('Dispute opened');
    });
  });

  describe('source === "reconciler" on-chain confirmation', () => {
    it('renders "Confirmed on-chain" instead of an actor label', () => {
      const mockTxs: EscrowTransaction[] = [
        {
          action: 'fund',
          from_status: 'created',
          to_status: 'funded',
          tx_hash: 'tx-reconciled',
          actor_uid: null,
          created_at: sampleDate,
          source: 'reconciler',
        },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      render(
        <ProcessStepper engagementId="eng-1" status="stay completed" />,
      );

      expect(screen.getByText('Confirmed on-chain')).toBeTruthy();
      expect(getActorLabel('fund', 'reconciler')).toBe('Confirmed on-chain');
    });
  });

  describe('Explorer links and network configuration', () => {
    it('defaults to testnet explorer URL', () => {
      expect(getStellarNetwork()).toBe('testnet');
      expect(getExplorerTxUrl('abc123')).toBe(
        'https://stellar.expert/explorer/testnet/tx/abc123',
      );
    });

    it('switches to pubnet explorer URL when configured for public network', () => {
      vi.stubEnv(
        'STELLAR_NETWORK_PASSPHRASE',
        'Public Global Stellar Network ; September 2015',
      );
      expect(getStellarNetwork()).toBe('pubnet');
      expect(getExplorerTxUrl('abc123')).toBe(
        'https://stellar.expert/explorer/pubnet/tx/abc123',
      );
    });

    it('renders explorer link with keyboard focus ring and accessible properties', () => {
      const mockTxs: EscrowTransaction[] = [
        {
          action: 'initialize',
          tx_hash: sampleTxHash,
          created_at: sampleDate,
          source: 'submit',
        },
      ];
      query.mockReturnValue({ data: { escrow_transactions: mockTxs } });

      const { container } = render(
        <ProcessStepper engagementId="eng-1" status="payment locked" />,
      );

      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.className).toContain('focus:ring-2');
      expect(link?.className).toContain('focus:ring-ring');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('Legacy statusToStep backward compatibility', () => {
    it('maintains expected 1-4 step mapping', () => {
      expect(statusToStep('pending')).toBe(1);
      expect(statusToStep('paid')).toBe(2);
      expect(statusToStep('blocked')).toBe(3);
      expect(statusToStep('released')).toBe(4);
    });

    it('maps numeric currentStep={4} to Released', () => {
      const { container } = render(<ProcessStepper currentStep={4} />);
      const currentLi = container.querySelector('[aria-current="step"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent).toContain('Released');
    });

    it('normalizes capitalized Disputed and Resolved statuses without transactions', () => {
      const disputed = render(<ProcessStepper status="Disputed" />);
      const disputedCurrent = disputed.container.querySelector('[aria-current="step"]');
      expect(disputedCurrent?.textContent).toContain('Disputed');
      disputed.unmount();

      const resolved = render(<ProcessStepper status="Resolved" />);
      const resolvedCurrent = resolved.container.querySelector('[aria-current="step"]');
      expect(resolvedCurrent?.textContent).toContain('Resolved');
      resolved.unmount();
    });
  });
});
