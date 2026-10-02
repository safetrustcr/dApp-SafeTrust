import { Request, Response } from 'express';
import { subscribeToEscrowStatus } from '../../services/hasura-ws.js';

export const escrowStatusStreamHandler = (req: Request, res: Response): void => {
  const contractId = req.query.contractId;

  if (typeof contractId !== 'string' || contractId.trim() === '') {
    res.status(400).json({ error: 'Missing required query param: contractId' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\ndata: {}\n\n');

  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30_000);

  let closed = false;
  let unsubscribe = (): void => {};

  const shutdown = (): void => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    if (!res.writableEnded) {
      res.end();
    }
  };

  unsubscribe = subscribeToEscrowStatus(
    contractId,
    (data) => {
      const escrow = data.escrows?.[0];
      if (escrow && !closed) {
        res.write(`event: status\ndata: ${JSON.stringify(escrow)}\n\n`);
      }
    },
    (error) => {
      console.error(`[sse] Hasura error for ${contractId}:`, error.message);
      shutdown();
    },
  );

  req.on('close', shutdown);
};
