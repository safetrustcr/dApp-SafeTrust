"use client";
// apps/frontend/src/components/dashboard/profile/ProfileSettingsSidebar.tsx
import type { CSSProperties } from 'react';
import { User, Wallet, Bell, Shield } from 'lucide-react';

type ProfileSettingsSidebarProps = {
  activeSection?: string;
  onSelect?: (section: string) => void;
};

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'security', label: 'Security', Icon: Shield },
] as const;

const styles = {
  nav: {
    border: '1px solid #fed7aa', borderRadius: '1rem',
    backgroundColor: '#ffffff', overflow: 'hidden',
    display: 'grid',
  } satisfies CSSProperties,
  item: (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.875rem 1.25rem', cursor: 'pointer',
    fontSize: '0.875rem', fontWeight: active ? 700 : 500,
    color: active ? '#f97316' : '#374151',
    backgroundColor: active ? '#fff7ed' : 'transparent',
    borderLeft: active ? '3px solid #f97316' : '3px solid transparent',
    transition: 'all 0.15s',
  }),
} as const;

export function ProfileSettingsSidebar({
  activeSection = 'profile',
  onSelect,
}: ProfileSettingsSidebarProps) {
  return (
    <nav style={styles.nav}>
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <div
          key={id}
          style={styles.item(activeSection === id)}
          onClick={() => onSelect?.(id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect?.(id)}
        >
          <Icon size={16} strokeWidth={2} />
          {label}
        </div>
      ))}
    </nav>
  );
}