import { Request, Response } from 'express';
import { subscribeToEscrowStatus } from '../../services/hasura-ws.js';

type StatusStreamQuery = {
  contractId?: string;
};

/**
 * GET /api/escrow/status-stream?contractId=<id>
 *
 * Upgrades the HTTP response to an SSE stream and bridges it to a Hasura
 * WebSocket subscription so the browser receives push updates whenever the
 * escrow status changes — without any client-side polling.
 *
 * SSE event types emitted:
 *   • connected  – fired once immediately after the connection is established
 *   • heartbeat  – fired every 30 s to prevent proxy / load-balancer timeouts
 *   • status     – fired whenever Hasura pushes a subscription update
 *   • error      – fired when the Hasura subscription encounters an error
 */
export const escrowStatusStreamHandler = (
  req: Request<Record<string, never>, unknown, unknown, StatusStreamQuery>,
  res: Response,
): void => {
  const { contractId } = req.query;

  if (!contractId || typeof contractId !== 'string' || contractId.trim() === '') {
    res.status(400).json({ error: 'Missing required query param: contractId' });
    return;
  }

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Initial connected event
  res.write('event: connected\ndata: {}\n\n');

  // Heartbeat every 30 s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30_000);

  // ── Hasura WebSocket subscription ─────────────────────────────────────────
  const cleanup = subscribeToEscrowStatus(
    contractId,
    (escrow) => {
      res.write(`event: status\ndata: ${JSON.stringify(escrow)}\n\n`);
    },
    (error) => {
      console.error(
        `[sse] Hasura subscription error for contractId=${contractId}:`,
        error.message,
      );
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
      );
    },
  );

  // ── Client disconnect cleanup ─────────────────────────────────────────────
  req.on('close', () => {
    clearInterval(heartbeat);
    cleanup();
    console.log(`[sse] Client disconnected — contractId: ${contractId}`);
  });
};
