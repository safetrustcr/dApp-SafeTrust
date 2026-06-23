import { EscrowStatusBadge, type EscrowStatus } from '@/components/dashboard/EscrowStatusBadge';

type LegacyInvoiceStatus = 'pending' | 'paid' | 'blocked' | 'released';

export function InvoiceHeader({
  invoiceNumber,
  paidAt,
  status: inputStatus,
}: {
  invoiceNumber: string;
  paidAt?: string;
  status: EscrowStatus | LegacyInvoiceStatus;
}) {
  const status = (() => {
    switch (inputStatus) {
      case 'pending':
        return 'pending_signature';
      case 'paid':
        return 'active';
      case 'blocked':
        return 'funded';
      case 'released':
        return 'completed';
      default:
        return inputStatus as EscrowStatus;
    }
  })();

  return (
    <div
      style={{
        padding: '0 0 1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
          {invoiceNumber}
        </h1>
        <EscrowStatusBadge status={status} className="px-4 py-1 text-sm font-bold" />
      </div>
      {status !== 'pending_signature' && paidAt && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
          Paid at {paidAt}
        </p>
      )}
    </div>
  );
}
