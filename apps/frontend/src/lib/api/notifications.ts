import { routes } from '@/lib/routes';
import { apiClient } from './client';

export type ApiNotification = {
  id: string;
  kind: 'event' | 'pending_action';
  type: 'milestone' | 'payment' | 'alert';
  message: string;
  timestamp: string;
  read: boolean;
  escrowId: string | null;
  apartmentId: string | null;
  conversationId: string | null;
  eventType?: string;
  action?: PendingActionName;
  txUrl?: string;
};

export type PendingActionName =
  | 'fund'
  | 'mark_milestone_completed'
  | 'approve_milestone'
  | 'release_funds'
  | 'resolve_dispute';

/** A notification as the dashboard renders it. */
export type DashboardNotification = {
  id: string;
  type: ApiNotification['type'];
  message: string;
  timestamp: string;
  read: boolean;
  escrowId?: string;
  kind: ApiNotification['kind'];
  action?: PendingActionName;
  /** Where clicking the notification goes: the escrow thread, or the escrow to act on. */
  href?: string;
  txUrl?: string;
};

/**
 * Where a notification leads. Lifecycle events open the conversation they were
 * posted in; a pending action opens the escrow it is about (falling back to the
 * escrow list when the escrow has no apartment, e.g. hotel reservations).
 */
export function notificationHref(item: ApiNotification): string | undefined {
  if (item.kind === 'event') {
    return item.conversationId ? routes.conversation(item.conversationId) : undefined;
  }
  return item.apartmentId && item.escrowId
    ? routes.escrowDetail(item.apartmentId, item.escrowId)
    : routes.escrowList();
}

/** Only https links are rendered as links; anything else is dropped. */
function safeTxUrl(url: string | undefined): string | undefined {
  return url && /^https:\/\//i.test(url) ? url : undefined;
}

export function toDashboardNotification(item: ApiNotification): DashboardNotification {
  return {
    id: item.id,
    type: item.type,
    message: item.message,
    timestamp: item.timestamp,
    read: item.read,
    kind: item.kind,
    ...(item.escrowId ? { escrowId: item.escrowId } : {}),
    ...(item.action ? { action: item.action } : {}),
    ...(notificationHref(item) ? { href: notificationHref(item) } : {}),
    ...(safeTxUrl(item.txUrl) ? { txUrl: safeTxUrl(item.txUrl) } : {}),
  };
}

/** The signed-in user's notifications: pending actions first, then lifecycle events. */
export async function fetchNotifications(limit?: number): Promise<DashboardNotification[]> {
  const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const response = await apiClient.get<{ notifications: ApiNotification[] }>(`/api/notifications${query}`);
  return (response?.notifications ?? []).map(toDashboardNotification);
}
