"use client";
// apps/frontend/src/components/dashboard/profile/ProfileSettingsSidebar.tsx
import type { CSSProperties } from 'react';
import { User } from 'lucide-react';

const styles = {
  nav: {
    border: '1px solid #fed7aa', borderRadius: '1rem',
    backgroundColor: '#ffffff', overflow: 'hidden',
    display: 'grid',
  } satisfies CSSProperties,
  item: (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.875rem 1.25rem', cursor: active ? 'default' : 'pointer',
    fontSize: '0.875rem', fontWeight: active ? 700 : 500,
    color: active ? '#f97316' : '#374151',
    backgroundColor: active ? '#fff7ed' : 'transparent',
    borderLeft: active ? '3px solid #f97316' : '3px solid transparent',
    transition: 'all 0.15s',
  }),
} as const;

export function ProfileSettingsSidebar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.item(true)} aria-current="page">
        <User size={16} strokeWidth={2} />
        Profile
      </div>
    </nav>
  );
}
