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
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1.25rem 1.5rem',
        borderRadius: '1rem',
        border: '1px solid #fed7aa',
        backgroundColor: '#ffffff',
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9ca3af',
          }}
        >
          Invoice number
        </p>
        <h1 style={{ margin: '0.35rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>{invoiceNumber}</h1>
        {status !== 'pending_signature' && paidAt && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Paid at {paidAt}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <EscrowStatusBadge status={status} className="px-3 py-1 text-sm font-bold" />
        {paidAt && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>Updated</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>{paidAt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
