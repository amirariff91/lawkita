"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PracticeAreaFilter } from "./practice-area-filter";
import { LocationFilter } from "./location-filter";
import { ExperienceFilter } from "./experience-filter";
import { ActiveFilter } from "./active-filter";
import { SortSelect } from "./sort-select";
import { Badge } from "@/components/ui/badge";
import type { ExperienceLevel, SortOption } from "@/types/lawyer";

interface FilterDrawerProps {
  practiceArea: string | null;
  state: string | null;
  city: string | null;
  experienceLevel: ExperienceLevel | null;
  showInactive: boolean;
  sort: SortOption;
  onPracticeAreaChange: (value: string | null) => void;
  onStateChange: (value: string | null) => void;
  onCityChange: (value: string | null) => void;
  onExperienceLevelChange: (value: ExperienceLevel | null) => void;
  onShowInactiveChange: (value: boolean) => void;
  onSortChange: (value: SortOption) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function FilterDrawer({
  practiceArea,
  state,
  city,
  experienceLevel,
  showInactive,
  sort,
  onPracticeAreaChange,
  onStateChange,
  onCityChange,
  onExperienceLevelChange,
  onShowInactiveChange,
  onSortChange,
  onClearFilters,
  activeFilterCount,
}: FilterDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 md:hidden">
          <Filter className="size-4" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="size-5 p-0 justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Filter Lawyers</SheetTitle>
          <SheetDescription>
            Narrow down your search with filters
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Practice Area</label>
            <PracticeAreaFilter
              value={practiceArea}
              onChange={onPracticeAreaChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <LocationFilter
              state={state}
              city={city}
              onStateChange={onStateChange}
              onCityChange={onCityChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Experience Level</label>
            <ExperienceFilter
              value={experienceLevel}
              onChange={onExperienceLevelChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <SortSelect value={sort} onChange={onSortChange} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <ActiveFilter
              showInactive={showInactive}
              onChange={onShowInactiveChange}
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="flex-1"
            >
              <X className="size-4 mr-2" aria-hidden="true" />
              Clear all
            </Button>
          )}
          <SheetClose asChild>
            <Button className="flex-1">Apply Filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
