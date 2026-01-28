"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMainPracticeAreas } from "@/lib/constants/practice-areas";

interface PracticeAreaFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const practiceAreas = getMainPracticeAreas();

export function PracticeAreaFilter({ value, onChange }: PracticeAreaFilterProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? null : v)}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Practice Area" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Practice Areas</SelectItem>
        {practiceAreas.map((area) => (
          <SelectItem key={area.slug} value={area.slug}>
            {area.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
