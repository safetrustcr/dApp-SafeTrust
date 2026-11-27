import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { promoteHotelUserToManager } from '../../services/hotel-provisioning.js';

type PromoteHotelManagerBody = {
  firebaseUid?: unknown;
};

/**
 * POST /api/admin/hotel-users/promote-manager
 * (also PATCH /api/admin/hotel-users/:firebaseUid/manager)
 *
 * Admin-only promotion of an existing hotel_industry user to MANAGER.
 * This is the write path for the role that create-hotel.handler requires on
 * the hotel owner; users are provisioned as GUEST by sync-user, so without
 * this endpoint a manager can only ever be created by seeding SQL.
 *
 * Body: { firebaseUid: string } (JSON mode) or the user id in the path.
 * Auth: Firebase Bearer token + SafeTrust admin role (requireAdmin).
 */
export const promoteHotelManagerHandler = async (
  req: AuthenticatedRequest & Request<unknown, unknown, PromoteHotelManagerBody>,
  res: Response,
): Promise<Response> => {
  const { uid } = req.user;
  const body = (req.body ?? {}) as PromoteHotelManagerBody;

  const firebaseUid =
    typeof body.firebaseUid === 'string' ? body.firebaseUid.trim() : '';

  if (!firebaseUid) {
    return res.status(400).json({ error: 'A Firebase UID is required' });
  }

  try {
    const user = await promoteHotelUserToManager(firebaseUid, uid);
    return res.status(200).json({ user, promoted: true });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'HOTEL_USER_NOT_FOUND'
    ) {
      return res.status(404).json({
        error: 'Hotel user not found. The user must sign up through the app first.',
      });
    }
    console.error('[admin/promote-hotel-manager] ❌ error:', error);
    return res.status(500).json({ error: 'Failed to promote hotel user to MANAGER' });
  }
};
