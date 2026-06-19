"use client";

const LOCATIONS = [
  { value: "San Jose", label: "San José" },
  { value: "Heredia", label: "Heredia" },
  { value: "Alajuela", label: "Alajuela" },
  { value: "Cartago", label: "Cartago" },
  { value: "Puntarenas", label: "Puntarenas" },
  { value: "Guanacaste", label: "Guanacaste" },
  { value: "Limon", label: "Limón" },
];

interface LocationFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
}

export function LocationFilter({
  selected,
  onChange,
}: LocationFilterProps) {
  const toggle = (loc: string) =>
    onChange(
      selected.includes(loc)
        ? selected.filter((l) => l !== loc)
        : [...selected, loc]
    );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Location</h3>
      {LOCATIONS.map(({ value, label }) => (
        <label
          key={value}
          className="flex cursor-pointer items-center gap-2"
        >
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={() => toggle(value)}
            className="rounded border-gray-300 accent-orange-500"
          />
          <span className="text-sm text-gray-600">{label}</span>
        </label>
      ))}
    </div>
  );
}
