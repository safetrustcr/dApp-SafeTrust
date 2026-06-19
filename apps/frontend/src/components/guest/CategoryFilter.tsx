"use client";

const CATEGORIES = ["Family", "Students", "Travelers"];

interface CategoryFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
}

export function CategoryFilter({
  selected,
  onChange,
}: CategoryFilterProps) {
  const toggle = (cat: string) =>
    onChange(
      selected.includes(cat)
        ? selected.filter((c) => c !== cat)
        : [...selected, cat]
    );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Category</h3>
      {CATEGORIES.map((cat) => (
        <label
          key={cat}
          className="flex cursor-pointer items-center gap-2"
        >
          <input
            type="checkbox"
            checked={selected.includes(cat)}
            onChange={() => toggle(cat)}
            className="rounded border-gray-300 accent-orange-500"
          />
          <span className="text-sm text-gray-600">{cat}</span>
        </label>
      ))}
    </div>
  );
}
