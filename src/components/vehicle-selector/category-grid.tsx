"use client";

import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/olyslager/category-icons";
import { sortByAppOrder } from "./sort-by-app-order";
import type { Category } from "@/lib/olyslager/types";

interface CategoryGridProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelect: (category: Category) => void;
}

export function CategoryGrid({ categories, selectedCategoryId, onSelect }: CategoryGridProps) {
  const sorted = sortByAppOrder(categories);
  return (
    // From lg up every category shares a single row (auto-cols-fr), however
    // many the dataset returns — Eurol has 9, Fuchs had 6.
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-flow-col lg:grid-cols-none lg:auto-cols-fr">
      {sorted.map((category) => {
        const Icon = CATEGORY_ICONS[category.id] ?? DEFAULT_CATEGORY_ICON;
        const selected = category.id === selectedCategoryId;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(category)}
            className={`flex min-w-0 flex-col items-center gap-1.5 rounded-[3px] border px-2 py-3 text-center transition-colors hover:border-primary ${
              selected ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <Icon className="size-8 text-primary" />
            <span className="text-xs font-medium">{category.categoryName}</span>
          </button>
        );
      })}
    </div>
  );
}
