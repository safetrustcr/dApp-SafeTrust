"use client";

interface LocationFilterProps {
  selected: string[];
  onChange: (locations: string[]) => void;
}

const LOCATIONS = [
  "San Jose",
  "Heredia",
  "Alajuela",
  "Cartago",
  "Puntarenas",
  "Guanacaste",
  "Limon",
];

export function LocationFilter({ selected, onChange }: LocationFilterProps) {
  const toggleLocation = (location: string) => {
    onChange(
      selected.includes(location)
        ? selected.filter((item) => item !== location)
        : [...selected, location]
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-800">Location</h2>
      <div className="space-y-2">
        {LOCATIONS.map((location) => (
          <label
            key={location}
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"
          >
            <input
              type="checkbox"
              checked={selected.includes(location)}
              onChange={() => toggleLocation(location)}
              className="h-4 w-4 rounded border-gray-300 accent-orange-500"
            />
            {location}
          </label>
        ))}
      </div>
    </section>
const LOCATIONS = [
  "San José", "Heredia", "Alajuela",
  "Cartago", "Puntarenas", "Guanacaste", "Limón",
];

interface LocationFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
}

export function LocationFilter({
  selected, onChange,
}: LocationFilterProps) {
  const toggle = (loc: string) =>
    onChange(
      selected.includes(loc)
        ? selected.filter((l) => l !== loc)
        : [...selected, loc]
    );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        Location
      </h3>
      {LOCATIONS.map((loc) => (
        <label key={loc}
          className="flex items-center gap-2 cursor-pointer">
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
