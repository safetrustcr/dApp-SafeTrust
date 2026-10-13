"use client";
import { useEffect, useState } from 'react';
import type { PropertyFilter, PublicRentalProperty } from '@safetrust/types';
import { API_BASE_URL } from '@/lib/api/client';

export function useRentalProperties(kind: PropertyFilter) {
  const [properties, setProperties] = useState<PublicRentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setPage(0); setProperties([]); }, [kind]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    async function load() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/listings?kind=${kind}&limit=50&offset=${page * 50}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load registered properties. Check that both tenants are ready.');
        const data: { properties: PublicRentalProperty[]; hasMore: boolean } = await response.json();
        if (controller.signal.aborted) return;
        setProperties((previous) => page === 0 ? data.properties : Array.from(new Map([...previous, ...data.properties].map((property) => [`${property.kind}:${property.id}`, property])).values()));
        setHasMore(data.hasMore);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof TypeError ? 'Cannot reach the SafeTrust API. Check that the API server is running.' : failure instanceof Error ? failure.message : 'Unable to load properties.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [kind, page, retry]);
  return { properties, loading, error, hasMore, loadMore: () => setPage((previous) => previous + 1), refetch: () => setRetry((previous) => previous + 1) };
}
