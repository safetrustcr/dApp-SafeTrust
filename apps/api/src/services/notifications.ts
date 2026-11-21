/*
 * Dashboard notifications for the signed-in user, built from data the API
 * already records — nothing here is invented:
 *
 *   - lifecycle events: the automated messages written by conversation-events.ts
 *     (escrow created / funded / milestone completed / approved / funds released /
 *     dispute opened / resolved) in the user's conversations;
 *   - pending actions: what the user can do *right now* on an escrow, derived
 *     from the escrow status and the role the user's wallet holds
 *     (ESCROW_ACTIONS x ACTION_ROLE, the same rules the action routes enforce).
 *
 * This module is pure (no I/O) so the rules are unit-tested; the Hasura queries
 * live in notifications-db.ts.
 */
import { ESCROW_ACTIONS, type EscrowActionName, type EscrowStatus } from '../domain/escrow-state.js';
import { ACTION_ROLE, rolesFor, type EscrowRecord, type EscrowRoles } from './escrow-authz.js';

export type NotificationKind = 'event' | 'pending_action';
export type NotificationType = 'milestone' | 'payment' | 'alert';
export type PendingActionName = Exclude<EscrowActionName, 'dispute'>;

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  type: NotificationType;
  message: string;
  /** ISO timestamp the event happened, or the escrow's last update for a pending action. */
  timestamp: string;
  read: boolean;
  escrowId: string | null;
  apartmentId: string | null;
  conversationId: string | null;
  /** Lifecycle event type (kind = 'event'). */
  eventType?: string;
  /** What the user can do (kind = 'pending_action'). */
  action?: PendingActionName;
  /** Block-explorer link recorded with the lifecycle event, when there is one. */
  txUrl?: string;
};

export type LifecycleMessageRow = {
  id: string;
  event_type: string | null;
  body: string;
  created_at: string;
  conversation: {
    id: string;
    escrow_id: string | null;
    apartment_id?: string | null;
    host_id: string;
    guest_id: string;
    host_last_read_at?: string | null;
    guest_last_read_at?: string | null;
  } | null;
};

export type ActionableEscrow = EscrowRecord & {
  apartment_id?: string | null;
  apartment?: { name?: string | null } | null;
};

const EVENT_TYPE: Record<string, NotificationType> = {
  escrow_created: 'milestone',
  escrow_funded: 'payment',
  milestone_completed: 'milestone',
  milestone_approved: 'milestone',
  funds_released: 'payment',
  dispute_opened: 'alert',
  dispute_resolved: 'alert',
};

/** Statuses in which at least one action can still be taken. */
export const ACTIONABLE_STATUSES: readonly EscrowStatus[] = ['created', 'funded', 'milestone_approved', 'disputed'];

/** Actions surfaced as "to do" items, in the order they are shown for one escrow. */
const PENDING_ACTIONS: readonly PendingActionName[] = [
  'fund',
  'mark_milestone_completed',
  'approve_milestone',
  'release_funds',
  'resolve_dispute',
];

const EXPLORER_LINE = /\n?\s*(https:\/\/stellar\.expert\/\S+)\s*$/;

export const MAX_NOTIFICATIONS = 100;
export const DEFAULT_NOTIFICATIONS = 50;

/** Splits the stored body into the readable message and the explorer link. */
export function splitEventBody(body: string): { message: string; txUrl?: string } {
  const match = EXPLORER_LINE.exec(body);
  if (!match) return { message: body.trim() };
  return { message: body.slice(0, match.index).trim(), txUrl: match[1] };
}

export function mapLifecycleMessage(row: LifecycleMessageRow, uid: string): NotificationItem | null {
  const eventType = row.event_type;
  if (!eventType || !(eventType in EVENT_TYPE) || !row.conversation) return null;

  const { conversation } = row;
  const lastReadAt =
    conversation.host_id === uid ? conversation.host_last_read_at : conversation.guest_last_read_at;
  const read = !!lastReadAt && new Date(lastReadAt).getTime() >= new Date(row.created_at).getTime();
  const { message, txUrl } = splitEventBody(row.body);

  return {
    id: `event:${row.id}`,
    kind: 'event',
    type: EVENT_TYPE[eventType],
    message,
    timestamp: row.created_at,
    read,
    escrowId: conversation.escrow_id,
    apartmentId: conversation.apartment_id ?? null,
    conversationId: conversation.id,
    eventType,
    ...(txUrl ? { txUrl } : {}),
  };
}

function rolesOf(escrow: EscrowRecord, platformAddress: string | undefined): EscrowRoles {
  // rolesFor() refuses to run without a platform address; its absence only
  // means "nobody here can resolve disputes", never "hide the other actions".
  return { ...rolesFor(escrow, platformAddress || 'unconfigured'), disputeResolver: platformAddress ?? '' };
}

const ACTION_COPY: Record<PendingActionName, (apartment: string) => string> = {
  fund: (apartment) => `Fund the escrow for ${apartment} to secure the deposit.`,
  mark_milestone_completed: (apartment) => `Mark the stay at ${apartment} as completed.`,
  approve_milestone: (apartment) => `Review and approve the completed stay at ${apartment}.`,
  release_funds: (apartment) => `Release the deposit for ${apartment}.`,
  resolve_dispute: (apartment) => `Resolve the dispute for ${apartment}.`,
};

/**
 * What `wallets` can do on `escrow` right now. An action is offered when the
 * escrow status allows it (ESCROW_ACTIONS) and one of the user's wallets holds
 * the role it requires (ACTION_ROLE). Two refinements follow the lifecycle:
 * the host is asked to mark the stay completed only until they have, and the
 * guest is asked to approve only once the host has.
 */
export function derivePendingActions(
  escrow: ActionableEscrow,
  wallets: readonly string[],
  options: { milestoneCompleted: boolean; platformAddress?: string },
): PendingActionName[] {
  const roles = rolesOf(escrow, options.platformAddress);
  return PENDING_ACTIONS.filter((action) => {
    if (!(ESCROW_ACTIONS[action].from as readonly string[]).includes(escrow.status)) return false;
    const holder = roles[ACTION_ROLE[action]];
    if (!holder || !wallets.includes(holder)) return false;
    if (action === 'mark_milestone_completed') return !options.milestoneCompleted;
    if (action === 'approve_milestone') return options.milestoneCompleted;
    return true;
  });
}

export function mapPendingActions(
  escrow: ActionableEscrow,
  wallets: readonly string[],
  options: { milestoneCompleted: boolean; platformAddress?: string },
): NotificationItem[] {
  const apartment = escrow.apartment?.name?.trim() || 'your booking';
  return derivePendingActions(escrow, wallets, options).map((action) => ({
    id: `action:${escrow.id}:${action}`,
    kind: 'pending_action' as const,
    type: 'alert' as const,
    message: ACTION_COPY[action](apartment),
    timestamp: escrow.updated_at ?? escrow.created_at ?? new Date(0).toISOString(),
    read: false,
    escrowId: escrow.id,
    apartmentId: escrow.apartment_id ?? null,
    conversationId: null,
    action,
  }));
}

export function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_NOTIFICATIONS;
  return Math.min(MAX_NOTIFICATIONS, Math.max(1, Math.trunc(value)));
}

/**
 * Pending actions first (they need the user), then lifecycle events newest
 * first. `limit` caps the events; every pending action is kept.
 */
export function buildNotifications(input: {
  uid: string;
  wallets: readonly string[];
  messages: readonly LifecycleMessageRow[];
  escrows: readonly ActionableEscrow[];
  milestoneCompletedEscrowIds: ReadonlySet<string>;
  platformAddress?: string;
  limit?: number;
}): NotificationItem[] {
  const actions = input.escrows
    .flatMap((escrow) =>
      mapPendingActions(escrow, input.wallets, {
        milestoneCompleted: input.milestoneCompletedEscrowIds.has(escrow.id),
        platformAddress: input.platformAddress,
      }),
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id));

  const events = input.messages
    .map((row) => mapLifecycleMessage(row, input.uid))
    .filter((item): item is NotificationItem => item !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id))
    .slice(0, clampLimit(input.limit));

  return [...actions, ...events];
}
