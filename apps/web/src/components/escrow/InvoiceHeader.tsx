// TODO: replace with real InvoiceHeader once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/InvoiceHeader.tsx

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-pink-100 text-pink-800',
  paid: 'bg-green-100 text-green-800',
  blocked: 'bg-blue-100 text-blue-800',
  released: 'bg-lime-100 text-lime-800',
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
    status === 'pending'
      ? 'Pending'
      : status === 'paid'
        ? 'Paid'
        : status === 'blocked'
          ? 'Deposit blocked'
          : 'Deposit released';

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{invoiceNumber}</h1>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[status]}`}>
          {label}
        </span>
      </div>
      {paidAt && <p className="text-xs text-muted-foreground mt-1">Paid at {paidAt}</p>}
    </div>
  );
}
