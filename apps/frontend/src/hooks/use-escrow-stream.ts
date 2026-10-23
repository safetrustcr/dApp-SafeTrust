'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type EscrowStreamEvent = {
  id: string;
  contract_id: string;
  status: string;
  amount: number;
  updated_at: string;
};

const RECONNECT_DELAY_MS = 3000;

export function useEscrowStream(contractId: string | null) {
  const [streamData, setStreamData] = useState<EscrowStreamEvent | null>(null);

  useEffect(() => {
    if (!contractId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const close = () => {
      es?.close();
      es = null;
      if (retry) clearTimeout(retry);
    };

    // EventSource cannot send headers, so the ID token goes in the query string.
    const connect = async () => {
      const user = auth.currentUser;
      if (!user || cancelled) return;
      const token = await user.getIdToken().catch(() => null);
      if (!token || cancelled) return;

      es = new EventSource(
        `${apiUrl}/api/escrow/status-stream?contractId=${encodeURIComponent(contractId)}` +
          `&access_token=${encodeURIComponent(token)}`,
      );

      es.addEventListener('status', (event: MessageEvent) => {
        try {
          setStreamData(JSON.parse(event.data) as EscrowStreamEvent);
        } catch {
          // ignore malformed frames
        }
      });

      // A 401/403 or an expired token closes the stream; reconnect with a fresh token.
      es.onerror = () => {
        close();
        if (!cancelled) retry = setTimeout(() => void connect(), RECONNECT_DELAY_MS);
      };
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      close();
      if (user) void connect();
    });

    return () => {
      cancelled = true;
      unsubscribe();
      close();
    };
  }, [contractId]);

  return { streamData };
}