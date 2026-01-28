"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPERIENCE_LEVELS, type ExperienceLevel } from "@/types/lawyer";

interface ExperienceFilterProps {
  value: ExperienceLevel | null;
  onChange: (value: ExperienceLevel | null) => void;
}

export function ExperienceFilter({ value, onChange }: ExperienceFilterProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? null : (v as ExperienceLevel))}
    >
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Experience" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Experience</SelectItem>
        {Object.entries(EXPERIENCE_LEVELS).map(([key, { label }]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
