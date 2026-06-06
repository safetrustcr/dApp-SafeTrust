"use client";

interface CategoryFilterProps {
  selected: string[];
  onChange: (categories: string[]) => void;
}

const CATEGORIES = ["Family", "Students", "Travelers"];

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const toggleCategory = (category: string) => {
    onChange(
      selected.includes(category)
        ? selected.filter((item) => item !== category)
        : [...selected, category]
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-800">Category</h2>
      <div className="space-y-2">
        {CATEGORIES.map((category) => (
          <label
            key={category}
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"
          >
            <input
              type="checkbox"
              checked={selected.includes(category)}
              onChange={() => toggleCategory(category)}
              className="h-4 w-4 rounded border-gray-300 accent-orange-500"
            />
            {category}
          </label>
        ))}
      </div>
    </section>
const CATEGORIES = ["Family", "Students", "Travelers"];

interface CategoryFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
}

export function CategoryFilter({
  selected, onChange,
}: CategoryFilterProps) {
  const toggle = (cat: string) =>
    onChange(
      selected.includes(cat)
        ? selected.filter((c) => c !== cat)
        : [...selected, cat]
    );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        Category
      </h3>
      {CATEGORIES.map((cat) => (
        <label key={cat}
          className="flex items-center gap-2 cursor-pointer">
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
