// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EscrowDetailView from '../EscrowDetailView';

const mocks = vi.hoisted(() => ({
  address: 'GAPPROVER123456789012345678901234567890123456789012345678',
  platformAddress: 'GRESOLVER123456789012345678901234567890123456789012345678',
  receiverAddress: 'GRECEIVER123456789012345678901234567890123456789012345678',
  isReady: true,
  execute: vi.fn(),
  actioning: false,
  phase: 'idle',
  actionError: null,
  conflict: null,
  getEscrowApi: vi.fn(),
  refetch: vi.fn(),
  queryData: null as any,
}));

vi.mock('@/hooks/use-active-wallet', () => ({
  useActiveWallet: () => ({
    address: mocks.address,
    walletType: 'freighter',
    isReady: mocks.isReady,
    signAndSubmit: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-escrow-action', () => ({
  useEscrowAction: () => ({
    execute: mocks.execute,
    actioning: mocks.actioning,
    phase: mocks.phase,
    actionError: mocks.actionError,
    conflict: mocks.conflict,
  }),
}));

vi.mock('@/lib/api/escrow', () => ({
  getEscrowApi: (...args: any[]) => mocks.getEscrowApi(...args),
}));

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: () => ({
      data: mocks.queryData,
      loading: false,
      error: null,
      refetch: mocks.refetch,
    }),
  };
});

vi.mock('@/hooks/use-hotel-escrow-resource', () => ({
  useHotelEscrowResource: () => ({
    data: mocks.queryData,
    loading: false,
    error: null,
    refetch: mocks.refetch,
  }),
}));

vi.mock('@/hooks/use-escrow-stream', () => ({
  useEscrowStream: () => ({
    streamData: null,
  }),
}));

vi.mock('@/components/escrow/PdfExportButton', () => ({
  PdfExportButton: () => <button type="button">Export PDF</button>,
}));

vi.mock('@/components/ui/image', () => ({
  default: () => null,
}));

describe('EscrowDetailView dispute & resolver flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isReady = true;
    mocks.actioning = false;
    mocks.phase = 'idle';
    mocks.address = 'GAPPROVER123456789012345678901234567890123456789012345678';
    process.env.NEXT_PUBLIC_PLATFORM_ADDRESS = mocks.platformAddress;
  });

  afterEach(cleanup);

  it('renders Open Dispute button for approver in funded status and opens dispute form', async () => {
    mocks.queryData = {
      escrows: [
        {
          id: 'escrow-1',
          contract_id: 'C123',
          engagement_id: 'eng-123',
          amount: 240,
          status: 'funded',
          sender_address: mocks.address,
          receiver_address: mocks.receiverAddress,
        },
      ],
      trustlessWorkEscrows: [
        {
          approver: mocks.address,
          marker: mocks.receiverAddress,
          resolver: mocks.platformAddress,
          amount: 240,
          balance: 240,
        },
      ],
    };

    render(<EscrowDetailView params={{ id: 'apt-1', escrowId: 'eng-123' }} />);

    const openDisputeBtn = screen.getByRole('button', { name: /Open Dispute/i });
    expect(openDisputeBtn).toBeDefined();

    fireEvent.click(openDisputeBtn);

    expect(screen.getByText('Open a Dispute')).toBeDefined();
    expect(screen.getByLabelText(/Reason for Dispute/i)).toBeDefined();
    expect(screen.getByLabelText(/Description/i)).toBeDefined();

    const continueBtn = screen.getByRole('button', { name: /Continue/i }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);

    // Select reason
    fireEvent.change(screen.getByLabelText(/Reason for Dispute/i), {
      target: { value: 'Property not as described' },
    });
    expect(continueBtn.disabled).toBe(false);

    // Enter description
    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'Water leak in the kitchen.' } });

    // Step to confirmation
    fireEvent.click(continueBtn);
    expect(screen.getByText('Confirm Dispute Submission')).toBeDefined();
    expect(screen.getByText(/Funds stay locked in the smart contract until the platform dispute resolver reviews the case/i)).toBeDefined();
    expect(screen.getByText('Property not as described')).toBeDefined();
    expect(screen.getByText('Water leak in the kitchen.')).toBeDefined();

    // Submit dispute
    mocks.execute.mockResolvedValueOnce({ success: true });
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Open Dispute/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mocks.execute).toHaveBeenCalledWith({
        apiRoute: '/api/escrow/dispute',
        apiBody: {
          engagementId: 'eng-123',
          reason: 'Property not as described',
          description: 'Water leak in the kitchen.',
        },
        sendTransactionBody: {
          action: 'dispute',
          contractId: 'C123',
          engagementId: 'eng-123',
          senderAddress: mocks.address,
          receiverAddress: mocks.receiverAddress,
        },
      });
    });
  });

  it('supports Other reason with custom text in dispute form', async () => {
    mocks.queryData = {
      escrows: [
        {
          id: 'escrow-1',
          contract_id: 'C123',
          engagement_id: 'eng-123',
          amount: 240,
          status: 'funded',
          sender_address: mocks.address,
          receiver_address: mocks.receiverAddress,
        },
      ],
      trustlessWorkEscrows: [
        {
          approver: mocks.address,
          marker: mocks.receiverAddress,
          resolver: mocks.platformAddress,
          amount: 240,
          balance: 240,
        },
      ],
    };

    render(<EscrowDetailView params={{ id: 'apt-1', escrowId: 'eng-123' }} />);

    fireEvent.click(screen.getByRole('button', { name: /Open Dispute/i }));

    fireEvent.change(screen.getByLabelText(/Reason for Dispute/i), {
      target: { value: 'Other' },
    });

    const customReasonInput = screen.getByLabelText(/Custom Reason/i);
    expect(customReasonInput).toBeDefined();

    const continueBtn = screen.getByRole('button', { name: /Continue/i }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);

    fireEvent.change(customReasonInput, { target: { value: 'Unexpected renovation noise' } });
    expect(continueBtn.disabled).toBe(false);

    fireEvent.click(continueBtn);
    expect(screen.getByText('Unexpected renovation noise')).toBeDefined();
  });

  it('never displays Open Dispute to the platform dispute resolver wallet', () => {
    // Current user is the resolver
    mocks.address = mocks.platformAddress;

    mocks.queryData = {
      escrows: [
        {
          id: 'escrow-1',
          contract_id: 'C123',
          engagement_id: 'eng-123',
          amount: 240,
          status: 'funded',
          sender_address: 'GSENDER...',
          receiver_address: mocks.receiverAddress,
        },
      ],
      trustlessWorkEscrows: [
        {
          approver: 'GSENDER...',
          marker: mocks.receiverAddress,
          resolver: mocks.platformAddress,
          amount: 240,
          balance: 240,
        },
      ],
    };

    render(<EscrowDetailView params={{ id: 'apt-1', escrowId: 'eng-123' }} />);

    expect(screen.queryByRole('button', { name: /Open Dispute/i })).toBeNull();
  });

  it('renders Resolver view for resolver when escrow is disputed and validates split in 7 decimals', async () => {
    mocks.address = mocks.platformAddress;
    mocks.getEscrowApi.mockResolvedValueOnce({
      dispute: {
        reason: 'Property not as described',
        description: 'Broken AC and no hot water.',
      },
    });

    mocks.queryData = {
      escrows: [
        {
          id: 'escrow-1',
          contract_id: 'C123',
          engagement_id: 'eng-123',
          amount: 240,
          status: 'disputed',
          sender_address: 'GSENDER...',
          receiver_address: mocks.receiverAddress,
        },
      ],
      trustlessWorkEscrows: [
        {
          approver: 'GSENDER...',
          marker: mocks.receiverAddress,
          resolver: mocks.platformAddress,
          amount: 240,
          balance: '240.0000000',
        },
      ],
    };

    render(<EscrowDetailView params={{ id: 'apt-1', escrowId: 'eng-123' }} />);

    // Dispute claim should be rendered
    await waitFor(() => {
      expect(screen.getAllByText(/Property not as described/i)[0]).toBeDefined();
      expect(screen.getAllByText(/Broken AC and no hot water\./i)[0]).toBeDefined();
    });

    const guestInput = screen.getByLabelText(/Guest Amount/i);
    const hostInput = screen.getByLabelText(/Host Amount/i);
    const resolveBtn = screen.getByRole('button', { name: /Resolve Dispute/i }) as HTMLButtonElement;

    expect(resolveBtn.disabled).toBe(true);

    // Partial input: 100 guest, remaining 140
    fireEvent.change(guestInput, { target: { value: '100' } });
    expect(resolveBtn.disabled).toBe(true);
    expect(screen.getByText('140')).toBeDefined();

    // Exact split with 7-decimal places: 120.1234567 + 119.8765433 = 240
    fireEvent.change(guestInput, { target: { value: '120.1234567' } });
    fireEvent.change(hostInput, { target: { value: '119.8765433' } });

    expect(screen.getAllByText('240').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('0')).toBeDefined();
    expect(resolveBtn.disabled).toBe(false);

    // Off-by-1 stroop (0.0000001) should block submit
    fireEvent.change(hostInput, { target: { value: '119.8765432' } });
    expect(resolveBtn.disabled).toBe(true);
    expect(screen.getByText('0.0000001')).toBeDefined();

    // Fix back
    fireEvent.change(hostInput, { target: { value: '119.8765433' } });
    expect(resolveBtn.disabled).toBe(false);

    // Submit resolution
    mocks.execute.mockResolvedValueOnce({ success: true });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(mocks.execute).toHaveBeenCalledWith({
        apiRoute: '/api/escrow/resolve-dispute',
        apiBody: {
          engagementId: 'eng-123',
          distributions: [
            { role: 'approver', amount: 120.1234567 },
            { role: 'serviceProvider', amount: 119.8765433 },
          ],
        },
        sendTransactionBody: {
          action: 'resolve_dispute',
          contractId: 'C123',
          engagementId: 'eng-123',
          senderAddress: 'GSENDER...',
          receiverAddress: mocks.receiverAddress,
        },
      });
    });
  });
});
