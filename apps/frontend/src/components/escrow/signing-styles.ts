import type { CSSProperties } from 'react';

/**
 * Shared look for wallet-signing UI, so EscrowPayFlow (checkout) and
 * WalletSigningStatus (escrow actions) stay visually identical.
 */
export const signingButtonStyle = {
  border: '1px solid #f97316',
  backgroundColor: '#f97316',
  color: '#ffffff',
  fontWeight: 700,
  padding: '0.5rem 1.75rem',
  borderRadius: '0.75rem',
  fontSize: '0.95rem',
  letterSpacing: '0.03em',
  lineHeight: 1,
} as const satisfies CSSProperties;

export const signingColors = {
  /** Secondary copy (hints, wallet line). */
  muted: '#6b7280',
  /** Error copy. */
  error: '#b91c1c',
  /** Waiting-for-wallet accent (orange-700, readable on white). */
  accent: '#c2410c',
  /** Success copy. */
  success: '#166534',
} as const;
