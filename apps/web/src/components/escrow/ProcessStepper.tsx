// TODO: replace with real ProcessStepper once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/ProcessStepper.tsx
// Steps: 1-Escrow created · 2-Payment sent · 3-Deposit blocked · 4-Deposit released

const STEPS = [
    'Escrow created',
    'Payment sent',
    'Deposit blocked',
    'Deposit released',
];

export function ProcessStepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
    return (
        <div className="border rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Process Status</h3>
            <div className="space-y-6 relative">
                {/* Connector line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 -z-0" />

                {STEPS.map((label, index) => {
                    const stepNum = index + 1;
                    const isActive = stepNum <= currentStep;
                    const isCurrent = stepNum === currentStep;

                    return (
                        <div key={label} className="flex items-center gap-4 relative z-10">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${isActive
                                    ? 'bg-green-600 text-white shadow-lg shadow-green-200 scale-110'
                                    : 'bg-white text-slate-300 border-2 border-slate-100'
                                    } ${isCurrent ? 'ring-4 ring-green-50' : ''}`}
                            >
                                {isActive && !isCurrent && stepNum < currentStep ? '✓' : stepNum}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-sm transition-colors duration-300 ${isActive ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
                                    }`}>
                                    {label}
                                </span>
                                {isCurrent && (
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Active</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
