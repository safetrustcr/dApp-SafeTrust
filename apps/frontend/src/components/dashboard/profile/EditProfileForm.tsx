"use client";
// apps/frontend/src/components/dashboard/profile/EditProfileForm.tsx
import type { CSSProperties, FormEvent } from 'react';

export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type EditProfileFormProps = {
  initialValues?: ProfileFormValues;
  onSave: (data: ProfileFormValues) => void;
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

const PROFILE_FIELDS = [
  { name: 'firstName', label: 'First name' },
  { name: 'lastName', label: 'Last name' },
  { name: 'email', label: 'Email' },
  { name: 'phone', label: 'Phone' },
] as const;

export function EditProfileForm({ initialValues, onSave }: EditProfileFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSave({
      firstName: String(formData.get('firstName') ?? ''),
      lastName: String(formData.get('lastName') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
    });
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
        Edit profile
      </h3>
      {PROFILE_FIELDS.map(({ name, label }) => (
        <div key={name} style={styles.field}>
          <label htmlFor={`profile-${name}`} style={styles.label}>{label}</label>
          <input
            id={`profile-${name}`}
            name={name}
            type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'}
            style={styles.input}
            placeholder={label}
            defaultValue={initialValues?.[name]}
          />
        </div>
      ))}
      <div>
        <button
          type="submit"
          style={styles.button}
        >
          Save changes
        </button>
      </div>
    </form>
  );
}
