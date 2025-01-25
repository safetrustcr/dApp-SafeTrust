import React from "react";

type Option = {
  label: string;
  value: string | number;
};

type CustomSelectProps = {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  placeholder?: string;
  name?: string;
};

function CustomSelect({
  options,
  value,
  onChange,
  label,
  placeholder = "Select an option",
  name = "",
}: CustomSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="block mb-1 lg:text-lg text-base text-black font-medium dark:text-white">
          {label}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={handleChange}
        className="border active:border-none  rounded-md p-2 w-full bg-transparent focus:ring-none "
      >
        <option
          className="dark:bg-black/50 dark:text-white/70 text-black bg-white/30"
          value=""
          disabled
        >
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="dark:bg-black/70 dark:text-white/70 text-black bg-white/30"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CustomSelect;
