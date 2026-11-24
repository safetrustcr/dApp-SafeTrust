// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EscrowDetailView from './EscrowDetailView';

const mockActiveWallet = vi.hoisted(() => vi.fn());
const mockEscrowAction = vi.hoisted(() => vi.fn());
const mockHotelResource = vi.hoisted(() => vi.fn());
const mockEscrowStream = vi.hoisted(() => vi.fn());
const mockUseQuery = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-active-wallet', () => ({
  useActiveWallet: mockActiveWallet,
}));

vi.mock('@/hooks/use-escrow-action', () => ({
  useEscrowAction: mockEscrowAction,
}));

vi.mock('@/hooks/use-hotel-escrow-resource', () => ({
  useHotelEscrowResource: mockHotelResource,
}));

vi.mock('@/hooks/use-escrow-stream', () => ({
  useEscrowStream: mockEscrowStream,
}));

vi.mock('@apollo/client', async () => ({
  ...(await vi.importActual('@apollo/client')),
  useQuery: mockUseQuery,
}));

vi.mock('@/components/ui/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const HOST_ADDRESS = 'G' + 'B'.repeat(55);
const GUEST_ADDRESS = 'G' + 'A'.repeat(55);

describe('EscrowDetailView milestone completion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveWallet.mockReturnValue({
      address: HOST_ADDRESS,
      walletType: 'freighter',
      isReady: true,
      signAndSubmit: vi.fn(),
    });
    mockEscrowAction.mockReturnValue({
      execute: vi.fn(),
      actioning: false,
      phase: null,
      actionError: null,
      conflict: false,
    });
    mockEscrowStream.mockReturnValue({ streamData: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('note textarea renders near the milestone button', () => {
    const escrow = {
      id: 'escrow-1',
      contract_id: 'CONTRACT1',
      engagement_id: 'eng-1',
      amount: 500,
      status: 'funded',
      sender_address: GUEST_ADDRESS,
      receiver_address: HOST_ADDRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: {
        id: 'apt-1',
        name: 'Apartment 1',
        price: 500,
      },
    };

    const trustlessWorkEscrow = {
      approver: GUEST_ADDRESS,
      marker: HOST_ADDRESS,
      releaser: 'PLATFORM',
      resolver: 'PLATFORM',
      milestones: [{ milestoneId: 'check_in', status: 'pending' }],
    };

    mockUseQuery.mockReturnValue({
      data: { escrows: [escrow], trustlessWorkEscrows: [trustlessWorkEscrow] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <EscrowDetailView
        params={{ id: 'apt-1', escrowId: 'eng-1' }}
        bookingKind="apartment"
      />,
    );

    const button = screen.getByRole('button', { name: /mark stay completed/i });
    expect(button).toBeDefined();

    const textarea = screen.getByLabelText('Completion note');
    expect(textarea).toBeDefined();
    expect(textarea.getAttribute('maxLength')).toBe('500');
    expect(
      screen.getByText('This does not release funds. The guest still needs to approve.'),
    ).toBeDefined();
    expect(screen.getByText('0/500')).toBeDefined();
  });

  it('character counter updates as user types', () => {
    const escrow = {
      id: 'escrow-1',
      contract_id: 'CONTRACT1',
      engagement_id: 'eng-1',
      amount: 500,
      status: 'funded',
      sender_address: GUEST_ADDRESS,
      receiver_address: HOST_ADDRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: { id: 'apt-1', name: 'Apartment 1', price: 500 },
    };

    const trustlessWorkEscrow = {
      approver: GUEST_ADDRESS,
      marker: HOST_ADDRESS,
      releaser: 'PLATFORM',
      resolver: 'PLATFORM',
      milestones: [{ milestoneId: 'check_in', status: 'pending' }],
    };

    mockUseQuery.mockReturnValue({
      data: { escrows: [escrow], trustlessWorkEscrows: [trustlessWorkEscrow] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <EscrowDetailView
        params={{ id: 'apt-1', escrowId: 'eng-1' }}
        bookingKind="apartment"
      />,
    );

    const textarea = screen.getByLabelText('Completion note') as HTMLTextAreaElement;
    expect(screen.getByText('0/500')).toBeDefined();

    fireEvent.change(textarea, { target: { value: 'Guest checked out on time and left keys on table.' } });
    expect(textarea.value).toBe('Guest checked out on time and left keys on table.');
    expect(screen.getByText(`${'Guest checked out on time and left keys on table.'.length}/500`)).toBeDefined();
  });

  it('hotel button hidden before check-out', () => {
    const futureCheckOut = new Date(Date.now() + 86400000).toISOString();
    const escrow = {
      id: 'res-1',
      contract_id: 'CONTRACT_HOTEL',
      engagement_id: 'hotel:res-1',
      amount: 240,
      status: 'funded',
      sender_address: GUEST_ADDRESS,
      receiver_address: HOST_ADDRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: {
        id: 'res-1',
        name: 'Hotel Room 101',
        check_out: futureCheckOut,
      },
    };

    const trustlessWorkEscrow = {
      approver: GUEST_ADDRESS,
      marker: HOST_ADDRESS,
      releaser: 'PLATFORM',
      resolver: 'PLATFORM',
      milestones: [{ milestoneId: 'check_in', status: 'pending' }],
    };

    mockHotelResource.mockReturnValue({
      data: { escrows: [escrow], trustlessWorkEscrows: [trustlessWorkEscrow] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <EscrowDetailView
        params={{ id: 'res-1', escrowId: 'hotel:res-1' }}
        bookingKind="hotel-room"
      />,
    );

    expect(screen.queryByRole('button', { name: /mark stay completed/i })).toBeNull();
    expect(screen.queryByLabelText('Completion note')).toBeNull();
  });

  it('hotel button visible after check-out', () => {
    const pastCheckOut = new Date(Date.now() - 86400000).toISOString();
    const escrow = {
      id: 'res-1',
      contract_id: 'CONTRACT_HOTEL',
      engagement_id: 'hotel:res-1',
      amount: 240,
      status: 'funded',
      sender_address: GUEST_ADDRESS,
      receiver_address: HOST_ADDRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: {
        id: 'res-1',
        name: 'Hotel Room 101',
        check_out: pastCheckOut,
      },
    };

    const trustlessWorkEscrow = {
      approver: GUEST_ADDRESS,
      marker: HOST_ADDRESS,
      releaser: 'PLATFORM',
      resolver: 'PLATFORM',
      milestones: [{ milestoneId: 'check_in', status: 'pending' }],
    };

    mockHotelResource.mockReturnValue({
      data: { escrows: [escrow], trustlessWorkEscrows: [trustlessWorkEscrow] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <EscrowDetailView
        params={{ id: 'res-1', escrowId: 'hotel:res-1' }}
        bookingKind="hotel-room"
      />,
    );

    expect(screen.getByRole('button', { name: /mark stay completed/i })).toBeDefined();
    expect(screen.getByLabelText('Completion note')).toBeDefined();
  });

  it('apartment button visible when funded regardless of date', () => {
    const futureCheckOut = new Date(Date.now() + 86400000).toISOString();
    const escrow = {
      id: 'escrow-1',
      contract_id: 'CONTRACT1',
      engagement_id: 'eng-1',
      amount: 500,
      status: 'funded',
      sender_address: GUEST_ADDRESS,
      receiver_address: HOST_ADDRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: {
        id: 'apt-1',
        name: 'Apartment 1',
        price: 500,
        available_until: futureCheckOut,
      },
    };

    const trustlessWorkEscrow = {
      approver: GUEST_ADDRESS,
      marker: HOST_ADDRESS,
      releaser: 'PLATFORM',
      resolver: 'PLATFORM',
      milestones: [{ milestoneId: 'check_in', status: 'pending' }],
    };

    mockUseQuery.mockReturnValue({
      data: { escrows: [escrow], trustlessWorkEscrows: [trustlessWorkEscrow] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <EscrowDetailView
        params={{ id: 'apt-1', escrowId: 'eng-1' }}
        bookingKind="apartment"
      />,
    );

    expect(screen.getByRole('button', { name: /mark stay completed/i })).toBeDefined();
    expect(screen.getByLabelText('Completion note')).toBeDefined();
  });

  it('surfaces host note evidence to the guest when approving milestone', () => {
    mockActiveWallet.mockReturnValue({
      address: GUEST_ADDRESS,
      walletType: 'freighter',
      isReady: true,
      signAndSubmit: vi.fn(),
    });

    const escrow = {
      id: 'escrow-1',
      contract_id: 'CONTRACT1',
      engagement_id: 'eng-1',
      amount: 500,
      status: 'funded',
      sender_address: GUEST_ADDRESS,
      receiver_address: HOST_ADDRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: { id: 'apt-1', name: 'Apartment 1', price: 500 },
    };

    const trustlessWorkEscrow = {
      approver: GUEST_ADDRESS,
      marker: HOST_ADDRESS,
      releaser: 'PLATFORM',
      resolver: 'PLATFORM',
      milestones: [{ milestoneId: 'check_in', status: 'completed', evidence: 'Guest was excellent and left keys on desk.' }],
    };

    mockUseQuery.mockReturnValue({
      data: { escrows: [escrow], trustlessWorkEscrows: [trustlessWorkEscrow] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <EscrowDetailView
        params={{ id: 'apt-1', escrowId: 'eng-1' }}
        bookingKind="apartment"
      />,
    );

    expect(screen.getByRole('button', { name: /approve milestone/i })).toBeDefined();
    expect(screen.getByText('Host note / evidence:')).toBeDefined();
    expect(screen.getByText('Guest was excellent and left keys on desk.')).toBeDefined();
  });

  it('sends newEvidence when completing milestone with note', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ txHash: 'tx-123' });
    mockEscrowAction.mockReturnValue({
      execute: mockExecute,
      actioning: false,
      phase: null,
      actionError: null,
      conflict: false,
    });

    const escrow = {
      id: 'escrow-1',
      contract_id: 'CONTRACT1',
      engagement_id: 'eng-1',
      amount: 500,
      status: 'funded',
      sender_address: GUEST_ADDRESS,
      receiver_address: HOST_ADDRESS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: { id: 'apt-1', name: 'Apartment 1', price: 500 },
    };

    const trustlessWorkEscrow = {
      approver: GUEST_ADDRESS,
      marker: HOST_ADDRESS,
      releaser: 'PLATFORM',
      resolver: 'PLATFORM',
      milestones: [{ milestoneId: 'check_in', status: 'pending' }],
    };

    mockUseQuery.mockReturnValue({
      data: { escrows: [escrow], trustlessWorkEscrows: [trustlessWorkEscrow] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <EscrowDetailView
        params={{ id: 'apt-1', escrowId: 'eng-1' }}
        bookingKind="apartment"
      />,
    );

    const textarea = screen.getByLabelText('Completion note');
    fireEvent.change(textarea, { target: { value: 'Inspection passed cleanly.' } });

    const button = screen.getByRole('button', { name: /mark stay completed/i });
    fireEvent.click(button);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        apiRoute: '/api/escrow/milestone-status',
        apiBody: expect.objectContaining({
          contractId: 'CONTRACT1',
          engagementId: 'eng-1',
          milestoneIndex: 0,
          newStatus: 'completed',
          newEvidence: 'Inspection passed cleanly.',
        }),
      }),
    );
  });
});
