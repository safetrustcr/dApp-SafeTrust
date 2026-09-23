import type { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';

import { ensureUserRole, syncUserProfile } from '../../services/user-provisioning.js';

interface SyncUserBody {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  country_code?: string;
  location?: string;
}

/**
 * POST /api/auth/sync-user
 *
 * Registration calls this after Firebase creates an account. The authenticated
 * token supplies the identity; this endpoint deliberately assigns only the
 * baseline guest role. Elevated roles are seeded or changed by an administrator.
 */
export const syncUserHandler = async (
  req: Request<unknown, unknown, SyncUserBody>,
  res: Response,
): Promise<Response> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Bearer token' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
    if (!decodedToken.email) {
      return res.status(400).json({ error: 'Token must contain a valid email address' });
    }

    const name = (decodedToken.name as string | undefined) ?? '';
    const [tokenFirstName = '', ...rest] = name.split(' ');
    const firstName = req.body.first_name?.trim() || tokenFirstName;
    const lastName = req.body.last_name?.trim() || rest.join(' ');
    const user = await syncUserProfile({
      id: decodedToken.uid,
      email: decodedToken.email,
      firstName,
      lastName,
      phoneNumber: req.body.phone_number,
      countryCode: req.body.country_code,
      location: req.body.location,
    });
    await ensureUserRole(decodedToken.uid, 'guest');

    console.log(`[sync-user] ✅ user synced — uid: ${decodedToken.uid}`);
    return res.status(200).json({ success: true, user });
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (typeof code === 'string' && code.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired Firebase token' });
    }
    console.error('[sync-user] ❌ error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
