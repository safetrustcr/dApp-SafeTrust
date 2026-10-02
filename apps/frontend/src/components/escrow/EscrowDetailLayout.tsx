import type { ReactNode } from 'react';

import { InvoiceHeader } from '@/components/escrow/InvoiceHeader';
import { NotesPanel } from '@/components/escrow/NotesPanel';
import { ProcessStepper } from '@/components/escrow/ProcessStepper';

export type EscrowDetailStatus = 'pending' | 'paid' | 'blocked' | 'released';

type EscrowDetailLayoutProps = {
  children: ReactNode;
  invoiceNumber: string;
  status: EscrowDetailStatus;
  paidAt?: string;
  notes?: string;
  defaultNotes?: string;
  onNotesChange?: (value: string) => void;
};

export function EscrowDetailLayout({
  children,
  invoiceNumber,
  status,
  paidAt,
  notes,
  defaultNotes,
  onNotesChange,
}: EscrowDetailLayoutProps) {
  return (
    <>
      <InvoiceHeader invoiceNumber={invoiceNumber} status={status} paidAt={paidAt} />

      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(14rem,0.9fr)] max-w-5xl mx-auto">
        <main>{children}</main>
        <aside className="grid content-start gap-4 pt-4 lg:px-3">
          <NotesPanel notes={notes} defaultNotes={defaultNotes} onNotesChange={onNotesChange} />
          <ProcessStepper status={status} />
        </aside>
      </div>
    </>
  );
}
