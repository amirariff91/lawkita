"use client";

import { SearchInput } from "@/components/search/search-input";
import { PracticeAreaFilter } from "./practice-area-filter";
import { LocationFilter } from "./location-filter";
import { ExperienceFilter } from "./experience-filter";
import { ActiveFilter } from "./active-filter";
import { SortSelect } from "./sort-select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ExperienceLevel, SortOption } from "@/types/lawyer";

interface FilterBarProps {
  query: string;
  practiceArea: string | null;
  state: string | null;
  city: string | null;
  experienceLevel: ExperienceLevel | null;
  showInactive: boolean;
  sort: SortOption;
  onQueryChange: (value: string) => void;
  onPracticeAreaChange: (value: string | null) => void;
  onStateChange: (value: string | null) => void;
  onCityChange: (value: string | null) => void;
  onExperienceLevelChange: (value: ExperienceLevel | null) => void;
  onShowInactiveChange: (value: boolean) => void;
  onSortChange: (value: SortOption) => void;
  onClearFilters: () => void;
}

export function FilterBar({
  query,
  practiceArea,
  state,
  city,
  experienceLevel,
  showInactive,
  sort,
  onQueryChange,
  onPracticeAreaChange,
  onStateChange,
  onCityChange,
  onExperienceLevelChange,
  onShowInactiveChange,
  onSortChange,
  onClearFilters,
}: FilterBarProps) {
  const hasFilters = query || practiceArea || state || city || experienceLevel || showInactive;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <SearchInput
        value={query}
        onChange={onQueryChange}
        className="max-w-2xl"
      />

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <PracticeAreaFilter
          value={practiceArea}
          onChange={onPracticeAreaChange}
        />
        <LocationFilter
          state={state}
          city={city}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
        />
        <ExperienceFilter
          value={experienceLevel}
          onChange={onExperienceLevelChange}
        />

        <ActiveFilter
          showInactive={showInactive}
          onChange={onShowInactiveChange}
        />

        <div className="flex-1" />

        <SortSelect value={sort} onChange={onSortChange} />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1"
          >
            <X className="size-4" aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
