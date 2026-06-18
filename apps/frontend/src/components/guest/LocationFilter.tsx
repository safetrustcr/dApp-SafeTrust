"use client";

const LOCATIONS = [
  "San José",
  "Heredia",
  "Alajuela",
  "Cartago",
  "Puntarenas",
  "Guanacaste",
  "Limón",
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
      {LOCATIONS.map((loc) => (
        <label
          key={loc}
          className="flex cursor-pointer items-center gap-2"
        >
          <input
            type="checkbox"
            checked={selected.includes(loc)}
            onChange={() => toggle(loc)}
            className="rounded border-gray-300 accent-orange-500"
          />
          <span className="text-sm text-gray-600">{loc}</span>
        </label>
      ))}
    </div>
  );
}
