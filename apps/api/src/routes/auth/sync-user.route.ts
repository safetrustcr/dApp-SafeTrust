import { Router } from 'express';
import { syncUserHandler } from './sync-user.handler.js';

const router: Router = Router();

/**
 * POST /api/auth/sync-user
 *
 * No authenticateFirebase middleware here — this handler verifies the token
 * itself via getAuth().verifyIdToken() so it can return a clear 401 before
 * touching Hasura, rather than relying on a generic middleware rejection.
 */
router.post('/sync-user', syncUserHandler);

export default router;