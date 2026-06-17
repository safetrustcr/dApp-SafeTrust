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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] max-w-5xl mx-auto">
        <main>{children}</main>
        <aside className="grid gap-4">
          <NotesPanel notes={notes} defaultNotes={defaultNotes} onNotesChange={onNotesChange} />
          <ProcessStepper status={status} />
        </aside>
      </div>
    </>
  );
}
