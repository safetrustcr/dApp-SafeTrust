import type { NextFunction, Request, Response } from 'express';
import { getFirebaseAuth } from '../services/firebase-admin.js';

export type AuthenticatedUser = {
  uid: string;
  email?: string;
};

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/** Verifies the Firebase ID token and attaches its authenticated uid. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  let auth;
  try {
    auth = getFirebaseAuth();
  } catch (error) {
    console.error('[auth] Firebase Admin initialization failed:', error);
    res.status(500).json({ error: 'Authentication service unavailable' });
    return;
  }

  void auth.verifyIdToken(token).then((decodedToken) => {
    (req as AuthenticatedRequest).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  }).catch(() => {
    res.status(401).json({ error: 'Invalid token' });
  });
}

export const authenticateFirebase = requireAuth;
