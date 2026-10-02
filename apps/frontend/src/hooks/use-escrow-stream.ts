'use client';

import { useEffect, useState } from 'react';

export type EscrowStreamEvent = {
  id: string;
  contract_id: string;
  status: string;
  amount: number;
  updated_at: string;
};

export function useEscrowStream(contractId: string | null) {
  const [streamData, setStreamData] = useState<EscrowStreamEvent | null>(null);

  useEffect(() => {
    if (!contractId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
    const es = new EventSource(
      `${apiUrl}/api/escrow/status-stream?contractId=${encodeURIComponent(contractId)}`,
    );

    es.addEventListener('status', (event: MessageEvent) => {
      try {
        setStreamData(JSON.parse(event.data) as EscrowStreamEvent);
      } catch {
        // ignore malformed frames
      }
    });

    return () => es.close();
  }, [contractId]);

  return { streamData };
}
