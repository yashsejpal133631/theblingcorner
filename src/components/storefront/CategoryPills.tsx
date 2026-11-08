"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CategoryPillsProps {
  categories: Array<{ id: string; name: string; slug: string }>;
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

export function CategoryPills({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryPillsProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center space-x-2 min-w-max">
        <button
          onClick={() => onSelectCategory("all")}
          className={cn(
            "px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 border",
            selectedCategory === "all"
              ? "bg-rose-900 text-white border-rose-900 shadow-sm"
              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
          )}
        >
          All Items
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={cn(
                "px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 border",
                isSelected
                  ? "bg-rose-900 text-white border-rose-900 shadow-sm"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

