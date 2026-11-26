// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InterestedPeopleTable, type RentalOffer } from '../InterestedPeopleTable';

const SAMPLE_OFFERS: RentalOffer[] = [
  {
    id: 'bid-1',
    tenant_name: 'Alice Guest',
    tenant_phone: '+506 88881111',
    tenant_wallet_address: 'GABC1234567890XYZ',
    proposed_price: 1200,
    desired_move_in: '2026-12-01T00:00:00Z',
    offer_date: '2026-11-25T10:00:00Z',
    bid_status: 'PENDING',
  },
  {
    id: 'bid-2',
    tenant_name: 'Bob Tenant',
    tenant_phone: '+506 88882222',
    tenant_wallet_address: 'GDEF1234567890XYZ',
    proposed_price: 1100,
    desired_move_in: '2026-12-15T00:00:00Z',
    offer_date: '2026-11-24T10:00:00Z',
    bid_status: 'APPROVED',
  },
];

describe('InterestedPeopleTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders offers and triggers accept/reject callbacks', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    render(
      <InterestedPeopleTable
        offers={SAMPLE_OFFERS}
        totalCount={2}
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    expect(screen.getByText('Alice Guest')).toBeTruthy();
    expect(screen.getByText('Bob Tenant')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Accept offer from Alice Guest'));
    expect(onAccept).toHaveBeenCalledWith('bid-1');

    fireEvent.click(screen.getByLabelText('Reject offer from Bob Tenant'));
    expect(onReject).toHaveBeenCalledWith('bid-2');
  });

  it('calls status filter and pagination callbacks', () => {
    const onStatusFilterChange = vi.fn();
    const onPageChange = vi.fn();

    render(
      <InterestedPeopleTable
        offers={SAMPLE_OFFERS}
        totalCount={15}
        page={0}
        pageSize={10}
        statusFilter="ALL"
        onStatusFilterChange={onStatusFilterChange}
        onPageChange={onPageChange}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Pending' }));
    expect(onStatusFilterChange).toHaveBeenCalledWith('PENDING');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('keeps Previous visible when page > 0 even if totalCount <= pageSize and clamps page', () => {
    const onPageChange = vi.fn();

    render(
      <InterestedPeopleTable
        offers={[]}
        totalCount={5}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('formats desired_move_in using UTC calendar date', () => {
    render(
      <InterestedPeopleTable
        offers={[
          {
            ...SAMPLE_OFFERS[0],
            desired_move_in: '2026-12-01T00:00:00.000Z',
          },
        ]}
        totalCount={1}
      />,
    );

    expect(screen.getByText('Dec 1, 2026')).toBeTruthy();
  });
});
