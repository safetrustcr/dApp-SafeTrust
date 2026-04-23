// TODO: replace with real ProcessStepper once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/ProcessStepper.tsx
// Steps: 1-Escrow created - 2-Payment sent - 3-Deposit blocked - 4-Deposit released

const STEPS = ['Escrow created', 'Payment sent', 'Deposit blocked', 'Deposit released'];

export function ProcessStepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <h3 className="font-semibold mb-3">Process</h3>
      <div className="space-y-3">
        {STEPS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum <= currentStep;
          return (
            <div key={label} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isActive
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground border'
                }`}
              >
                {stepNum}
              </div>
              <span
                className={`text-sm ${
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
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
