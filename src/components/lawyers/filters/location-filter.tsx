"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllStates, getCitiesForState } from "@/lib/constants/locations";

interface LocationFilterProps {
  state: string | null;
  city: string | null;
  onStateChange: (value: string | null) => void;
  onCityChange: (value: string | null) => void;
}

const states = getAllStates();

export function LocationFilter({
  state,
  city,
  onStateChange,
  onCityChange,
}: LocationFilterProps) {
  const cities = state ? getCitiesForState(state) : [];

  const handleStateChange = (value: string) => {
    if (value === "all") {
      onStateChange(null);
      onCityChange(null);
    } else {
      onStateChange(value);
      onCityChange(null); // Reset city when state changes
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select value={state ?? "all"} onValueChange={handleStateChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All States</SelectItem>
          {states.map((s) => (
            <SelectItem key={s.slug} value={s.slug}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {state && cities.length > 0 && (
        <Select
          value={city ?? "all"}
          onValueChange={(v) => onCityChange(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
