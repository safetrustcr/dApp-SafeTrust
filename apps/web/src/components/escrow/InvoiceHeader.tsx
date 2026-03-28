// TODO: replace with real InvoiceHeader once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/InvoiceHeader.tsx

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-pink-100 text-pink-800 border-pink-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    blocked: 'bg-blue-100 text-blue-800 border-blue-200',
    released: 'bg-lime-100 text-lime-800 border-lime-200',
};

export function InvoiceHeader({
    invoiceNumber,
    status,
    paidAt,
}: {
    invoiceNumber: string;
    status: 'pending' | 'paid' | 'blocked' | 'released';
    paidAt?: string;
}) {
    const label =
        status === 'pending' ? 'Pending' :
            status === 'paid' ? 'Paid' :
                status === 'blocked' ? 'Deposit blocked' :
                    'Deposit released';

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{invoiceNumber}</h1>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${STATUS_STYLES[status]}`}>
                    {label}
                </span>
            </div>
            {paidAt ? (
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Paid at {paidAt}
                </p>
            ) : (
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Awaiting Payment
                </p>
            )}
        </div>
    );
}
