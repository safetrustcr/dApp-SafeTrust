'use client';

import { useEffect, useState } from 'react';
import type { PropertyFilter, PublicRentalProperty } from '@safetrust/types';
import { fetchPublicListings } from '@/lib/api/listings';

interface ListingsOptions {
  limit: number;
  kind?: PropertyFilter;
}

export function useListings({ limit, kind = 'both' }: ListingsOptions) {
  const [properties, setProperties] = useState<PublicRentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    async function load() {
      try {
        const data = await fetchPublicListings(kind, limit, 0, controller.signal);
        if (!controller.signal.aborted) setProperties(data.properties);
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof TypeError
              ? 'Cannot reach the SafeTrust API. Check that the API server is running.'
              : failure instanceof Error
                ? failure.message
                : 'Unable to load properties.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [kind, limit, retry]);

  return { properties, loading, error, refetch: () => setRetry((value) => value + 1) };
}
