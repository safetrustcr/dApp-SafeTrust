'use client';

import type { CSSProperties } from 'react';

const styles = {
  panel: {
    backgroundColor: 'transparent',
    padding: 0,
  } satisfies CSSProperties,
  label: {
    display: 'block',
    marginBottom: '0.6rem',
    fontWeight: 700,
    fontSize: '0.85rem',
  } satisfies CSSProperties,
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '0.2rem',
    padding: '0.7rem',
    font: 'inherit',
    resize: 'vertical',
    minHeight: '5.15rem',
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
