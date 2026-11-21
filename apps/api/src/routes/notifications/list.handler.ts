import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import { getUserWallets } from '../../services/escrow-authz.js';
import { getHotelUserWallets } from '../../services/hotel-reservation-escrow.js';
import {
  fetchActionableEscrows,
  fetchLifecycleMessages,
  fetchMilestoneCompletedEscrowIds,
} from '../../services/notifications-db.js';
import {
  DEFAULT_NOTIFICATIONS,
  MAX_NOTIFICATIONS,
  buildNotifications,
} from '../../services/notifications.js';

function parseLimit(raw: unknown): number {
  if (raw === undefined) return DEFAULT_NOTIFICATIONS;
  const value = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(value) || value < 1 || value > MAX_NOTIFICATIONS) {
    throw new ApiError(400, 'INVALID_LIMIT', `limit must be an integer between 1 and ${MAX_NOTIFICATIONS}.`);
  }
  return value;
}

/** Every Stellar wallet the user is registered with, across both tenants' wallet tables. */
async function callerWallets(uid: string): Promise<string[]> {
  const wallets = new Set(await getUserWallets(uid));
  try {
    for (const wallet of await getHotelUserWallets(uid)) wallets.add(wallet);
  } catch {
    // The hotel wallet table is optional per tenant; apartment escrows still work without it.
    console.warn('[notifications] hotel wallets unavailable', { userId: uid });
  }
  return [...wallets];
}

/**
 * GET /api/notifications
 *
 * The signed-in user's dashboard notifications: pending actions (from escrow
 * status and role) followed by recorded lifecycle events. Scoped strictly to the
 * caller — the uid comes from the verified token, never from the request.
 */
export const listNotificationsHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseLimit(req.query.limit);
    const { uid } = req.user;
    const platformAddress = process.env.PLATFORM_STELLAR_ADDRESS || undefined;

    const wallets = await callerWallets(uid);
    const isResolver = !!platformAddress && wallets.includes(platformAddress);

    const [messages, escrows] = await Promise.all([
      fetchLifecycleMessages(uid, limit),
      fetchActionableEscrows(wallets, isResolver),
    ]);
    const milestoneCompletedEscrowIds = await fetchMilestoneCompletedEscrowIds(
      escrows.filter((escrow) => escrow.status === 'funded').map((escrow) => escrow.id),
    );

    const notifications = buildNotifications({
      uid,
      wallets,
      messages,
      escrows,
      milestoneCompletedEscrowIds,
      platformAddress,
      limit,
    });

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ notifications });
  },
);
