'use client';

import { useEffect, useState, useRef } from 'react';

/** Shape of the data pushed by the SSE `status` event. */
export type EscrowStreamEvent = {
  id: string;
  contract_id: string;
  status: string;
  balance: number;
  updated_at: string;
};

type UseEscrowStreamResult = {
  /** Latest escrow data pushed from the server, or null if none received yet. */
  streamData: EscrowStreamEvent | null;
  /** Whether the SSE connection has been acknowledged by the server. */
  connected: boolean;
  /** Error message if the server pushed an error event. */
  error: string | null;
};

/**
 * useEscrowStream — subscribes to real-time escrow status updates via SSE.
 *
 * Opens a persistent connection to `GET /api/escrow/status-stream?contractId=…`
 * and updates `streamData` whenever a `status` event is received.
 * EventSource automatically reconnects on network errors.
 *
 * @param contractId - Stellar contract ID of the escrow to watch. Pass null
 *   to skip opening a connection (e.g., while the escrowId is still loading).
 */
export function useEscrowStream(contractId: string | null): UseEscrowStreamResult {
  const [streamData, setStreamData] = useState<EscrowStreamEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!contractId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
    const es = new EventSource(
      `${apiUrl}/api/escrow/status-stream?contractId=${encodeURIComponent(contractId)}`,
    );

    esRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
      setError(null);
    });

    es.addEventListener('status', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as EscrowStreamEvent;
        setStreamData(data);
      } catch {
        // ignore malformed frames
      }
    });

    es.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data ?? '{}') as { error?: string };
        setError(data.error ?? 'Stream error');
      } catch {
        setError('Stream error');
      }
    });

    es.onerror = () => {
      // EventSource will automatically reconnect; just mark as disconnected.
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [contractId]);

  return { streamData, connected, error };
}
