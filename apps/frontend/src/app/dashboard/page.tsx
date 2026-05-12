// TODO: replace stub sections with real components once merged in frontend-SafeTrust
// Sources:
//   frontend-SafeTrust/src/components/dashboard/EscrowsByStatus.tsx
//   frontend-SafeTrust/src/components/dashboard/EscrowTable.tsx
//   frontend-SafeTrust/src/components/dashboard/QuickActions.tsx

import type { CSSProperties } from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  } satisfies CSSProperties,
  intro: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  } satisfies CSSProperties,
  card: {
    border: '1px solid #fdba74',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '1rem',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  } satisfies CSSProperties,
  muted: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#78716c',
  } satisfies CSSProperties,
} as const;

export default function DashboardPage() {
  return (
    <div style={styles.container}>
      <div style={styles.intro}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Dashboard</h1>
        <p style={styles.muted}>
          Welcome to SafeTrust — your escrow management hub.
        </p>
      </div>

      {/* TODO: replace with <QuickActions /> */}
      <div style={styles.card}>
        <p style={styles.muted}>Quick Actions — coming soon</p>
      </div>

      {/* TODO: replace with <EscrowsByStatus /> */}
      <div style={styles.card}>
        <p style={styles.muted}>Escrow Overview — coming soon</p>
      </div>

      {/* TODO: replace with <EscrowTable /> */}
      <div style={styles.card}>
        <p style={styles.muted}>Recent Escrow Transactions — coming soon</p>
      </div>
    </div>
  );
}
