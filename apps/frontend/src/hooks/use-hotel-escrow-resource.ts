"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { postAuthenticatedApi } from '@/lib/api/client';

/** Hotel reads use the authenticated API because guest GraphQL access is restricted. */
export function useHotelEscrowResource<T>(path: string | null, poll = false) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<Error>();
  const generation = useRef(0);
  const refetch = useCallback(async () => {
    if (!path) return;
    const attempt = ++generation.current;
    try {
      const result = await postAuthenticatedApi<T>(path, undefined, { method: 'GET' });
      if (attempt === generation.current) { setData(result); setError(undefined); }
    } catch (failure) {
      if (attempt === generation.current) setError(failure instanceof Error ? failure : new Error('Unable to load reservation.'));
    } finally {
      if (attempt === generation.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(undefined);
    setError(undefined);
    setLoading(Boolean(path));
    void refetch();
    const timer = path && poll ? setInterval(() => void refetch(), 10000) : undefined;
    return () => { generation.current++; if (timer) clearInterval(timer); };
  }, [path, poll, refetch]);
  return { data, loading, error, refetch };
}
