import { Router } from 'express';
import { escrowStatusStreamHandler } from './status-stream.handler.js';

const router = Router();

router.get('/status-stream', escrowStatusStreamHandler);

export default router;
