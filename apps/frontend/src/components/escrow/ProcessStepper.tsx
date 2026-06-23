import type { CSSProperties } from 'react';
import { Home, CreditCard, Lock, Users, type LucideIcon } from 'lucide-react';

type Step = {
  step: 1 | 2 | 3 | 4;
  icon: LucideIcon;
  description: string;
};

import type { EscrowDetailStatus } from '@/components/escrow/EscrowDetailLayout';

const STEPS = [
  { step: 1, title: 'Create escrow' },
  { step: 2, title: 'Payment batch' },
  { step: 3, title: 'Deposit blocked' },
  { step: 4, title: 'Deposit released' },
] as const;

function statusToStep(status: EscrowDetailStatus): 1 | 2 | 3 | 4 {
  switch (status) {
    case 'pending':
      return 1;
    case 'paid':
      return 2;
    case 'blocked':
      return 3;
    case 'released':
      return 4;
  }
}

type ProcessStepperProps =
  | { currentStep: 1 | 2 | 3 | 4; status?: never }
  | { status: EscrowDetailStatus; currentStep?: never };

export function ProcessStepper({ currentStep, status }: ProcessStepperProps) {
  const activeStep = currentStep ?? statusToStep(status ?? 'pending');
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
          const isActive = step === activeStep;
          const isComplete = step < activeStep;
          const markerStyle: CSSProperties = isActive
            ? { backgroundColor: '#22c55e', color: '#ffffff', border: '1px solid #22c55e' }
            : isComplete
              ? { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
              : { backgroundColor: '#ffffff', color: '#9ca3af', border: '1px solid #d1d5db' };

          return (
            <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    ...markerStyle,
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: '1px',
                      flex: 1,
                      minHeight: '1.25rem',
                      backgroundColor: '#e5e7eb',
                      marginTop: '0.25rem',
                    }}
                  />
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  paddingTop: '0.5rem',
                  paddingBottom: isLast ? 0 : '1rem',
                  color: '#6b7280',
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                }}
              >
                {description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
