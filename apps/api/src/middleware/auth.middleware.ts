import type { NextFunction, Request, Response } from 'express';

export type AuthenticatedUser = {
  uid: string;
  email?: string;
};

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Extracts the Firebase uid from the Bearer token on the request.
 *
 * TODO(SECURITY): the token signature is not verified — this only decodes the
 * payload, matching the existing sync-user handler. A forged token with a
 * chosen uid can therefore self-assign a role. Verify with firebase-admin
 * (`verifyIdToken`) before this is exposed beyond the host promotion flow.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const segments = token.split('.');
    if (segments.length !== 3 || !segments[1]) {
      throw new Error('Malformed token');
    }

    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString()) as {
      user_id?: string;
      sub?: string;
      uid?: string;
      email?: string;
    };

    const uid = payload.user_id ?? payload.uid ?? payload.sub;
    if (!uid) {
      throw new Error('Token missing uid');
    }

    (req as AuthenticatedRequest).user = { uid, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
