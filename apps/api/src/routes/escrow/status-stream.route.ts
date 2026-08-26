import { Router } from 'express';
import { escrowStatusStreamHandler } from './status-stream.handler.js';

const router = Router();

/** GET /api/escrow/status-stream?contractId=<id> */
router.get('/status-stream', escrowStatusStreamHandler);

export default router;
