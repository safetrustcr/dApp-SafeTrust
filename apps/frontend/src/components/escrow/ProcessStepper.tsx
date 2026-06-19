import type { CSSProperties } from 'react';
import { Banknote, Check, FileLock2, HandCoins, Home } from 'lucide-react';

const STEPS = [
  {
    step: 1,
    title: 'Escrow deployed',
    description: 'The escrow contract has been deployed on Stellar.',
    Icon: Home,
  },
  {
    step: 2,
    title: 'Deposit paid',
    description: "The buyer's deposit has been paid into escrow.",
    Icon: Banknote,
  },
  {
    step: 3,
    title: 'Deposit blocked',
    description: 'Funds are locked while the agreement is in progress.',
    Icon: FileLock2,
  },
  {
    step: 4,
    title: 'Deposit released',
    description: 'The deposit has been released to its recipient.',
    Icon: HandCoins,
  },
] as const;

const MARKER_SIZE = '2.25rem';

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
      <style>{`
        @keyframes process-stepper-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
          70% { box-shadow: 0 0 0 0.5rem rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .process-stepper-active { animation: none !important; }
        }
      `}</style>
      <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1rem' }}>Process</h3>
      <div style={{ display: 'grid', gap: '0.25rem' }}>
        {STEPS.map(({ step, title, description, Icon }, index) => {
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          const isLast = index === STEPS.length - 1;

          const markerStyle: CSSProperties = isActive
            ? { backgroundColor: '#22c55e', color: '#ffffff', border: '1px solid #22c55e' }
            : isComplete
              ? { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
              : { backgroundColor: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb' };

          return (
            <div key={step} style={{ display: 'flex', gap: '0.85rem' }}>
              {/* Marker column with connector line */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  className={isActive ? 'process-stepper-active' : undefined}
                  style={{
                    ...markerStyle,
                    width: MARKER_SIZE,
                    height: MARKER_SIZE,
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    animation: isActive
                      ? 'process-stepper-pulse 2s ease-out infinite'
                      : undefined,
                  }}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isComplete ? (
                    <Check size={18} strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Icon size={18} strokeWidth={2} aria-hidden />
                  )}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flexGrow: 1,
                      minHeight: '1.5rem',
                      backgroundColor: isComplete ? '#86efac' : '#e5e7eb',
                    }}
                  />
                )}
              </div>

              {/* Step text */}
              <div style={{ paddingBottom: isLast ? 0 : '0.9rem' }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#111827' : '#374151',
                  }}
                >
                  {title}
                </p>
                <p style={{ margin: '0.2rem 0 0', color: '#6b7280', fontSize: '0.8rem' }}>
                  {description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
