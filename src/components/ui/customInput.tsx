"use client";
import React, { useState } from "react";

type CustomInputProps = {
  type: "textarea" | "text" | "number" | "currency" | "date";
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  placeholder?: string;
  name?: string;
  rows?: number;
};

export function CustomInput({
  type,
  value,
  onChange,
  label,
  placeholder = "",
  name = "",
  rows = 4,
}: CustomInputProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let newValue: string | number = e.target.value;
    if (type === "number" || type === "currency") {
      newValue = e.target.value.replace(/[^0-9.]/g, "");
    }
    setInputValue(newValue);
    onChange(newValue);
  };

  const renderCurrencyInput = () => (
    <div className="relative w-full">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
        $
      </span>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        className="border rounded-md p-2 pl-8 w-full"
      />
    </div>
  );

  const renderDateInput = () => (
    <input
      type="date"
      name={name}
      value={inputValue}
      onChange={handleChange}
      className="border rounded-md p-2 w-full"
    />
  );

  return (
    <div className="mb-4">
      {label && <label className="block mb-1 font-medium">{label}</label>}
      {type === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={inputValue}
          rows={rows}
          onChange={handleChange}
          className="border rounded-md p-2 w-full"
        />
      ) : type === "currency" ? (
        renderCurrencyInput()
      ) : type === "date" ? (
        renderDateInput()
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          className="border rounded-md p-2 w-full"
        />
      )}
    </div>
  );
}
