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
  );
}
