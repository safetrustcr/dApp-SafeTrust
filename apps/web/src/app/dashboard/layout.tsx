// TODO: replace sidebar stub with real Sidebar component once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/dashboard/Sidebar.tsx

import type { CSSProperties, ReactNode } from 'react';

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#fff7ed',
  } satisfies CSSProperties,
  aside: {
    display: 'none',
    width: '16rem',
    flexShrink: 0,
    borderRight: '1px solid #fed7aa',
    backgroundColor: '#ffedd5',
    padding: '1rem',
  } satisfies CSSProperties,
  sidebarCopy: {
    fontSize: '0.875rem',
    color: '#78716c',
  } satisfies CSSProperties,
  main: {
    flex: 1,
    maxWidth: '80rem',
    padding: '1.5rem',
  } satisfies CSSProperties,
} as const;

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div style={styles.wrapper}>
      {/* TODO: replace with <Sidebar /> — frontend-SafeTrust/src/components/dashboard/Sidebar.tsx */}
      <aside style={styles.aside} className="dashboard-sidebar">
        <div style={styles.sidebarCopy}>Sidebar — coming soon</div>
      </aside>
      <main style={styles.main}>{children}</main>
    </div>
  );
}
