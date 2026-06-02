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
  );
}
