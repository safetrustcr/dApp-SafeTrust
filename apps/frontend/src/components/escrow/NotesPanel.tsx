import type { CSSProperties } from 'react';

const styles = {
  panel: {
    border: '1px solid #fed7aa',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '1.5rem',
  } satisfies CSSProperties,
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
  } satisfies CSSProperties,
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '0.75rem',
    padding: '0.75rem',
    font: 'inherit',
    resize: 'vertical',
    minHeight: '6rem',
  } satisfies CSSProperties,
} as const;

type NotesPanelProps = {
  notes?: string;
  defaultNotes?: string;
  onNotesChange?: (value: string) => void;
  id?: string;
  placeholder?: string;
};

export function NotesPanel({
  notes,
  defaultNotes,
  onNotesChange,
  id = 'escrow-notes',
  placeholder = 'Add notes...',
}: NotesPanelProps) {
  return (
    <div style={styles.panel}>
      <label htmlFor={id} style={styles.label}>
        Notes
      </label>
      <textarea
        id={id}
        style={styles.input}
        placeholder={placeholder}
        {...(notes !== undefined
          ? { value: notes, onChange: onNotesChange ? (event) => onNotesChange(event.target.value) : undefined }
          : { defaultValue: defaultNotes, onChange: onNotesChange ? (event) => onNotesChange(event.target.value) : undefined })}
      />
    </div>
  );
}
