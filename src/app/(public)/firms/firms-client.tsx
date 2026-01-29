"use client";

import { useQueryStates, parseAsString, parseAsInteger, parseAsStringLiteral } from "nuqs";
import { useTransition, useCallback } from "react";
import { FirmGrid, FirmGridSkeleton } from "@/components/firms";
import { SearchInput } from "@/components/search/search-input";
import { LocationFilter } from "@/components/lawyers/filters/location-filter";
import { PracticeAreaFilter } from "@/components/lawyers/filters/practice-area-filter";
import { Pagination } from "@/components/lawyers/pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import type { FirmCardData } from "@/lib/db/queries/firms";
import { firmSortOptions, type FirmSortOption } from "@/lib/search/firm-search-params";

interface FirmsClientProps {
  initialData: {
    firms: FirmCardData[];
    total: number;
    page: number;
    totalPages: number;
  };
}

const sortLabels: Record<FirmSortOption, string> = {
  lawyers: "Most Lawyers",
  experience: "Most Experienced",
  name: "Name (A-Z)",
};

export function FirmsClient({ initialData }: FirmsClientProps) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      query: parseAsString.withDefault(""),
      state: parseAsString,
      city: parseAsString,
      practiceArea: parseAsString,
      sort: parseAsStringLiteral(firmSortOptions).withDefault("lawyers"),
      page: parseAsInteger.withDefault(1),
    },
    {
      shallow: false,
      startTransition,
    }
  );

  const updateParam = useCallback(
    <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
      if (key !== "page") {
        setParams({ [key]: value, page: 1 } as Partial<typeof params>);
      } else {
        setParams({ [key]: value } as Partial<typeof params>);
      }
    },
    [setParams]
  );

  const clearFilters = useCallback(() => {
    setParams({
      query: "",
      state: null,
      city: null,
      practiceArea: null,
      sort: "lawyers",
      page: 1,
    });
  }, [setParams]);

  const hasFilters = params.query || params.state || params.city || params.practiceArea;

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchInput
          value={params.query}
          onChange={(value) => updateParam("query", value)}
          placeholder="Search firms by name..."
          className="max-w-2xl"
        />

        <div className="flex flex-wrap items-center gap-2">
          <PracticeAreaFilter
            value={params.practiceArea}
            onChange={(value) => updateParam("practiceArea", value)}
          />
          <LocationFilter
            state={params.state}
            city={params.city}
            onStateChange={(value) => updateParam("state", value)}
            onCityChange={(value) => updateParam("city", value)}
          />

          <div className="flex-1" />

          <Select
            value={params.sort}
            onValueChange={(value) => updateParam("sort", value as FirmSortOption)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {firmSortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {sortLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1"
            >
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {initialData.total} {initialData.total === 1 ? "firm" : "firms"} found
        </p>
      </div>

      {/* Results */}
      {isPending ? (
        <FirmGridSkeleton count={6} />
      ) : initialData.firms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No firms found matching your criteria.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : (
        <FirmGrid firms={initialData.firms} />
      )}

      {/* Pagination */}
      {initialData.totalPages > 1 && (
        <Pagination
          currentPage={initialData.page}
          totalPages={initialData.totalPages}
          onPageChange={(page) => updateParam("page", page)}
        />
      )}
    </div>
  );
}
