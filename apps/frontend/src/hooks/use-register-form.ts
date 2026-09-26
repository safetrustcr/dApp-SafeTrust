import { useState } from "react";
import { RegisterUserInput } from "@/lib/auth/register-user";

export function useRegisterForm() {
  const [fields, setFields] = useState<RegisterUserInput>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneCountryCode: "+506",
    phone: "",
    location: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: keyof RegisterUserInput, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  return {
    fields,
    handleChange,
    isLoading,
    setIsLoading,
    error,
    setError,
  };
}
