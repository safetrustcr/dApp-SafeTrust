// apps/frontend/src/components/performance/CacheStatus.tsx
import type { CSSProperties } from 'react';

type CacheStatusProps = {
  label?: string;
  hit?: boolean;
  entries?: number;
};

const styles = {
  card: {
    border: '1px solid #e5e7eb', borderRadius: '0.75rem',
    backgroundColor: '#f9fafb', padding: '0.875rem 1.125rem',
    display: 'flex', alignItems: 'center', gap: '0.75rem',
  } satisfies CSSProperties,
  dot: { width: '0.5rem', height: '0.5rem', borderRadius: '9999px', flexShrink: 0 } satisfies CSSProperties,
  label: { margin: 0, fontSize: '0.8rem', color: '#374151', fontWeight: 500 } satisfies CSSProperties,
  meta: { margin: 0, fontSize: '0.75rem', color: '#9ca3af' } satisfies CSSProperties,
} as const;

export function CacheStatus({ label = 'Cache', hit = true, entries }: CacheStatusProps) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.dot, backgroundColor: hit ? '#22c55e' : '#f97316' }} />
      <div>
        <p style={styles.label}>{label}</p>
        {entries !== undefined && (
          <p style={styles.meta}>{entries} entries</p>
        )}
      </div>
    </div>
  );
}