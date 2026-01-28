"use client";

import { Badge } from "@/components/ui/badge";
import { CASE_CATEGORIES, type CaseCategory } from "@/types/case";

interface CategoryFilterProps {
  value: CaseCategory | null;
  onChange: (value: CaseCategory | null) => void;
}

const categoryColors: Record<string, string> = {
  corruption: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50",
  political: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50",
  corporate: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50",
  criminal: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50",
  constitutional: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-900/50",
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={value === null ? "default" : "outline"}
        className="cursor-pointer transition-colors"
        onClick={() => onChange(null)}
      >
        All
      </Badge>
      {CASE_CATEGORIES.map((category) => (
        <Badge
          key={category.value}
          variant={value === category.value ? "default" : "secondary"}
          className={`cursor-pointer transition-colors ${
            value !== category.value ? categoryColors[category.value] : ""
          }`}
          onClick={() => onChange(category.value)}
        >
          {category.label}
        </Badge>
      ))}
    </div>
  );
}
