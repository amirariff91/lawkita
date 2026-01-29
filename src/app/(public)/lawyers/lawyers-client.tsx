"use client";

import { useQueryStates, parseAsString, parseAsInteger, parseAsBoolean } from "nuqs";
import { useTransition, useCallback } from "react";
import { LawyerGrid, LawyerGridSkeleton } from "@/components/lawyers";
import { FilterBar } from "@/components/lawyers/filters/filter-bar";
import { FilterDrawer } from "@/components/lawyers/filters/filter-drawer";
import { Pagination } from "@/components/lawyers/pagination";
import { SearchInput } from "@/components/search/search-input";
import type { LawyerSearchResult, ExperienceLevel, SortOption } from "@/types/lawyer";

interface LawyersClientProps {
  initialData: LawyerSearchResult;
}

export function LawyersClient({ initialData }: LawyersClientProps) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      query: parseAsString.withDefault(""),
      practiceArea: parseAsString,
      state: parseAsString,
      city: parseAsString,
      experienceLevel: parseAsString,
      showInactive: parseAsBoolean.withDefault(false),
      sort: parseAsString.withDefault("relevance"),
      page: parseAsInteger.withDefault(1),
    },
    {
      shallow: false,
      startTransition,
    }
  );

  const updateParam = useCallback(
    <K extends keyof typeof params>(key: K, value: typeof params[K]) => {
      // Reset to page 1 when filters change
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
      practiceArea: null,
      state: null,
      city: null,
      experienceLevel: null,
      showInactive: false,
      sort: "relevance",
      page: 1,
    });
  }, [setParams]);

  const activeFilterCount = [
    params.practiceArea,
    params.state,
    params.city,
    params.experienceLevel,
    params.showInactive,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Mobile search */}
      <div className="md:hidden space-y-4">
        <SearchInput
          value={params.query}
          onChange={(value) => updateParam("query", value)}
        />
        <div className="flex items-center justify-between">
          <FilterDrawer
            practiceArea={params.practiceArea}
            state={params.state}
            city={params.city}
            experienceLevel={params.experienceLevel as ExperienceLevel | null}
            showInactive={params.showInactive}
            sort={params.sort as SortOption}
            onPracticeAreaChange={(value) => updateParam("practiceArea", value)}
            onStateChange={(value) => updateParam("state", value)}
            onCityChange={(value) => updateParam("city", value)}
            onExperienceLevelChange={(value) =>
              updateParam("experienceLevel", value)
            }
            onShowInactiveChange={(value) => updateParam("showInactive", value)}
            onSortChange={(value) => updateParam("sort", value)}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
          <p className="text-sm text-muted-foreground">
            {initialData.total} {initialData.total === 1 ? "lawyer" : "lawyers"} found
          </p>
        </div>
      </div>

      {/* Desktop filters */}
      <div className="hidden md:block">
        <FilterBar
          query={params.query}
          practiceArea={params.practiceArea}
          state={params.state}
          city={params.city}
          experienceLevel={params.experienceLevel as ExperienceLevel | null}
          showInactive={params.showInactive}
          sort={params.sort as SortOption}
          onQueryChange={(value) => updateParam("query", value)}
          onPracticeAreaChange={(value) => updateParam("practiceArea", value)}
          onStateChange={(value) => updateParam("state", value)}
          onCityChange={(value) => updateParam("city", value)}
          onExperienceLevelChange={(value) =>
            updateParam("experienceLevel", value)
          }
          onShowInactiveChange={(value) => updateParam("showInactive", value)}
          onSortChange={(value) => updateParam("sort", value)}
          onClearFilters={clearFilters}
        />
        <p className="text-sm text-muted-foreground mt-4">
          {initialData.total} {initialData.total === 1 ? "lawyer" : "lawyers"} found
        </p>
      </div>

      {/* Results */}
      {isPending ? (
        <LawyerGridSkeleton count={6} />
      ) : initialData.lawyers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No lawyers found matching your criteria.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : (
        <LawyerGrid lawyers={initialData.lawyers} />
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
