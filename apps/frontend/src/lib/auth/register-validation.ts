export interface RegisterFormFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  location: string;
}

export function validateRegisterForm(fields: RegisterFormFields): string | null {
  if (!fields.firstName.trim()) return "First name is required";
  if (!fields.lastName.trim()) return "Last name is required";
  if (!fields.email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    return "Please enter a valid email address";
  if (fields.password.length < 6)
    return "Password must be at least 6 characters";
  if (!fields.phone.trim()) return "Phone number is required";
  if (!/^\d{6,15}$/.test(fields.phone.replace(/\s/g, "")))
    return "Please enter a valid phone number (digits only)";
  if (!fields.location) return "Please select your location";
  return null;
}
