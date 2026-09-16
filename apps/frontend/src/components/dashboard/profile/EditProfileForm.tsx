"use client";
// apps/frontend/src/components/dashboard/profile/EditProfileForm.tsx
import type { CSSProperties } from 'react';

type EditProfileFormProps = {
  onSave?: (data: Record<string, string>) => void;
};

const styles = {
  form: { display: 'grid', gap: '1.25rem' } satisfies CSSProperties,
  field: { display: 'grid', gap: '0.4rem' } satisfies CSSProperties,
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#374151' } satisfies CSSProperties,
  input: {
    border: '1px solid #d1d5db', borderRadius: '0.75rem',
    padding: '0.65rem 0.9rem', font: 'inherit', fontSize: '0.875rem',
    color: '#111827', width: '100%',
  } satisfies CSSProperties,
  button: {
    border: '1px solid #f97316', backgroundColor: '#f97316',
    color: '#ffffff', fontWeight: 700, padding: '0.65rem 1.5rem',
    borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.875rem',
    marginTop: '0.5rem',
  } satisfies CSSProperties,
} as const;

export function EditProfileForm({ onSave }: EditProfileFormProps) {
  return (
    <div style={styles.form}>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
        Edit profile
      </h3>
      {(['First name', 'Last name', 'Email', 'Phone'] as const).map((field) => (
        <div key={field} style={styles.field}>
          <label style={styles.label}>{field}</label>
          <input type="text" style={styles.input} placeholder={field} />
        </div>
      ))}
      <div>
        <button
          type="button"
          style={styles.button}
          onClick={() => onSave?.({})}
        >
          Save changes
        </button>
      </div>
    </div>
  );
}