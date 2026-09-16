import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { getAuth } from 'firebase-admin/auth';

export type AuthenticatedUser = {
  uid: string;
  email: string | undefined;
  role: string;
};

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Verifies the Firebase Bearer token.
 * Sets req.user = { uid, email, role: 'guest' } — role is resolved from the
 * DB by the promote-to-host handler or the tenant middleware downstream.
 * The default 'guest' ensures every authenticated request has a typed role.
 */
export const authenticateFirebase: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Bearer token' });
    return;
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decoded = await getAuth().verifyIdToken(idToken, true);
    (req as AuthenticatedRequest).user = {
      uid: decoded.uid,
      email: decoded.email,
      role: 'guest', // resolved from DB by downstream middleware/handlers
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase token' });
  }
};
