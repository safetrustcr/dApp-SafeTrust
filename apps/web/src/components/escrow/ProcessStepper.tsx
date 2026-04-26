// TODO: replace with real ProcessStepper once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/ProcessStepper.tsx
// Steps: 1-Escrow created - 2-Payment sent - 3-Deposit blocked - 4-Deposit released

import type { CSSProperties } from 'react';

const STEPS = ['Escrow created', 'Payment sent', 'Deposit blocked', 'Deposit released'];

export function ProcessStepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div
      style={{
        border: '1px solid #fed7aa',
        borderRadius: '1rem',
        backgroundColor: '#ffffff',
        padding: '1.25rem',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Process</h3>
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        {STEPS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isComplete = stepNum < currentStep;
          const markerStyle: CSSProperties = isActive
            ? { backgroundColor: '#22c55e', color: '#ffffff', border: '1px solid #22c55e' }
            : isComplete
              ? { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
              : { backgroundColor: '#ffffff', color: '#9ca3af', border: '1px solid #d1d5db' };

          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  ...markerStyle,
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {stepNum}
              </div>
              <span
                style={{
                  fontSize: '0.9rem',
                  color: isActive || isComplete ? '#111827' : '#6b7280',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
