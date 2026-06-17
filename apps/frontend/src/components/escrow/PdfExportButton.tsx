import type { CSSProperties } from 'react';
import { FileText } from 'lucide-react';

// MVP stub. Phase 2 will wire actual PDF generation (see issue #187).
const pdfButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  border: '1px solid #ef4444',
  backgroundColor: '#ef4444',
  color: '#ffffff',
  fontWeight: 600,
  padding: '0.4rem 0.85rem',
  borderRadius: '0.5rem',
  fontSize: '0.85rem',
  lineHeight: 1,
  opacity: 0.7,
  cursor: 'not-allowed',
};

export function PdfExportButton({ label = 'PDF' }: { label?: string }) {
  // Wrap in span so the browser's native title tooltip fires on hover.
  // Chrome/Safari suppress pointer events (and tooltips) on disabled buttons.
  return (
    <span title="PDF export coming soon" style={{ display: 'inline-block' }}>
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label="Export to PDF (coming soon)"
        style={pdfButtonStyle}
      >
        <FileText size={16} aria-hidden="true" />
        {label}
      </button>
    </span>
  );
}
