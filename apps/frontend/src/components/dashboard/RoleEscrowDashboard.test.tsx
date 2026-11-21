// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./DashboardHeader', () => ({ DashboardHeader: () => null }));
vi.mock('./EscrowsByStatus', () => ({ EscrowsByStatus: () => null }));
vi.mock('./RecentActivity', () => ({ RecentActivity: () => null }));
vi.mock('./QuickActions', () => ({ QuickActions: () => null }));
vi.mock('./EscrowTable', () => ({ EscrowTable: () => null }));
vi.mock('./analytics', () => ({ AnalyticsDashboard: () => null }));

import { RoleEscrowDashboard, type NotificationData } from './RoleEscrowDashboard';
import * as mockData from '@/lib/mockData';

const action: NotificationData = {
  id: 'action:e1:fund',
  type: 'alert',
  kind: 'pending_action',
  message: 'Fund the escrow for Casa Azul to secure the deposit.',
  timestamp: '2026-11-02T10:00:00.000Z',
  read: false,
  escrowId: 'e1',
  href: '/escrow/apt-1/escrow/e1',
};

const event: NotificationData = {
  id: 'event:m1',
  type: 'payment',
  kind: 'event',
  message: 'Deposit of 100 USDC is locked in escrow.',
  timestamp: '2026-11-03T10:00:00.000Z',
  read: true,
  href: '/dashboard/messages/conv-1',
  txUrl: 'https://stellar.expert/explorer/testnet/tx/abc',
};

describe('RoleEscrowDashboard notifications', () => {
  afterEach(cleanup);

  it('shows nothing made up for a user with no notifications', () => {
    render(<RoleEscrowDashboard userRole="guest" notifications={[]} />);
    expect(screen.getByText('No new notifications')).toBeTruthy();
    expect(screen.queryAllByTestId('dashboard-notification')).toHaveLength(0);
  });

  it('renders the real notifications it is given: action badge, links and transaction link', () => {
    render(<RoleEscrowDashboard userRole="guest" notifications={[action, event]} />);
    const rows = screen.getAllByTestId('dashboard-notification');
    expect(rows).toHaveLength(2);

    expect(within(rows[0]).getByText('Action needed')).toBeTruthy();
    expect(within(rows[0]).getByText(action.message)).toBeTruthy();
    expect(within(rows[0]).getByRole('link').getAttribute('href')).toBe('/escrow/apt-1/escrow/e1');

    expect(within(rows[1]).queryByText('Action needed')).toBeNull();
    expect(within(rows[1]).getByText(event.message).closest('a')?.getAttribute('href')).toBe('/dashboard/messages/conv-1');
    const tx = within(rows[1]).getByRole('link', { name: 'View transaction' });
    expect(tx.getAttribute('href')).toBe(event.txUrl);
    expect(tx.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps the order it is given (pending actions first) and shows the first three', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...event, id: `event:${i}`, message: `Event ${i}`, href: undefined, txUrl: undefined }));
    render(<RoleEscrowDashboard userRole="guest" notifications={[action, ...many]} />);
    const rows = screen.getAllByTestId('dashboard-notification');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Fund the escrow');
    expect(rows[1].textContent).toContain('Event 0');
    expect(screen.getByText('View all notifications')).toBeTruthy();
  });

  it('says when notifications could not be loaded instead of faking an empty state', () => {
    render(<RoleEscrowDashboard userRole="guest" notifications={[]} notificationsError="Hasura is down" />);
    expect(screen.getByText(/could not be loaded/i)).toBeTruthy();
    expect(screen.queryByText('No new notifications')).toBeNull();
  });

  it('keeps showing the last good list when a refresh fails', () => {
    render(<RoleEscrowDashboard userRole="guest" notifications={[event]} notificationsError="timeout" />);
    expect(screen.getByText(event.message)).toBeTruthy();
    expect(screen.queryByText(/could not be loaded/i)).toBeNull();
  });

  it('the mock notification generators are gone from production code', () => {
    expect('generateMockNotifications' in mockData).toBe(false);
    expect('fetchMockNotifications' in mockData).toBe(false);
  });
});
