"use client";
import React, { useEffect, useState } from "react";

type CustomInputProps = {
  type: "textarea" | "text" | "number" | "currency" | "date" | "checkbox";
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  placeholder?: string;
  name?: string;
  rows?: number;
  error?: string;
  required?: boolean;
  showRequired?: boolean;
};

export function CustomInput({
  type,
  value,
  onChange,
  label,
  placeholder = "",
  name = "",
  rows = 4,
  error,
  required,
  showRequired = false,
}: CustomInputProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

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
        required={required}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        className="border rounded-md p-2 pl-8 w-full text:black dark:text-white/70"
      />
    </div>
  );

  const renderDateInput = () => (
    <input
      type="date"
      name={name}
      required={required}
      value={inputValue}
      onChange={handleChange}
      className="border rounded-md p-2 w-full  text:black dark:text-white/70 dark:placeholder:text-white/70 placeholder:text-black"
    />
  );

  return (
    <div className="mb-4">
      {label && (
        <label className="block mb-1 lg:text-lg text-base font-medium dark:text-white">
          {label}
        </label>
      )}
      {type === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={inputValue}
          rows={rows}
          required={required}
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
          required={required}
          value={inputValue}
          min={0}
          onChange={handleChange}
          className="border rounded-md p-2 w-full dark:placeholder:text-white/50 "
        />
      )}

      {required && !value && showRequired && (
        <p className="text-red-500 text-xs">This field is required</p>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

type CheckboxProps = {
  label: string;
  name: string;
  inputValue: boolean;
  handleChange: (value: boolean) => void;
};

export function CheckBox({
  label,
  name,
  inputValue,
  handleChange,
}: CheckboxProps) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target.checked);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        name={name}
        checked={Boolean(inputValue)}
        onChange={onChange}
        className="w-5 h-5 border rounded dark:focus:ring-white/70 focus:ring-black focus:ring-2"
      />
      <span className="text-black dark:text-white/70 text-base font-normal lg:text-lg">
        {label}
      </span>
    </div>
  );
}
