// TODO: replace with real component once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/ProcessStepper.tsx

import type { CSSProperties } from 'react';

const STEPS = [
  { step: 1, title: 'Create escrow' },
  { step: 2, title: 'Payment batch' },
  { step: 3, title: 'Deposit blocked' },
  { step: 4, title: 'Deposit released' },
] as const;

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
        {STEPS.map(({ step, title }) => {
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          const markerStyle: CSSProperties = isActive
            ? { backgroundColor: '#22c55e', color: '#ffffff', border: '1px solid #22c55e' }
            : isComplete
              ? { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
              : { backgroundColor: '#ffffff', color: '#9ca3af', border: '1px solid #d1d5db' };

          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  ...markerStyle,
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {step}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#111827' : '#374151',
                  }}
                >
                  {title}
                </p>
                <p style={{ margin: '0.2rem 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>
                  {isActive ? 'Current step' : isComplete ? 'Completed' : 'Pending'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
