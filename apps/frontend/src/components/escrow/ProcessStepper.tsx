import type { CSSProperties } from 'react';
import { Home, CreditCard, Lock, Users, type LucideIcon } from 'lucide-react';

type Step = {
  step: 1 | 2 | 3 | 4;
  icon: LucideIcon;
  description: string;
};

const STEPS: Step[] = [
  {
    step: 1,
    icon: Home,
    description:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
  },
  {
    step: 2,
    icon: CreditCard,
    description:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
  },
  {
    step: 3,
    icon: Lock,
    description:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
  },
  {
    step: 4,
    icon: Users,
    description:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
  },
];

export function ProcessStepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
        Process
      </h3>
      <div style={{ position: 'relative', display: 'grid', gap: '1rem' }}>
        {STEPS.map(({ step, icon: Icon, description }, idx) => {
          const isActiveOrComplete = step <= currentStep;
          const markerStyle: CSSProperties = isActiveOrComplete
            ? { backgroundColor: '#22c55e', color: '#ffffff' }
            : { backgroundColor: '#e5e7eb', color: '#9ca3af' };

          const isLast = idx === STEPS.length - 1;

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
