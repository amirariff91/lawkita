"use client";

import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";
import { useTransition, useCallback } from "react";
import { CaseGrid, CaseGridSkeleton, CategoryFilter, StatusFilter } from "@/components/cases";
import { PaginationLink } from "@/components/lawyers";
import { SearchInput } from "@/components/search/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { CaseSearchResult, CaseCategory, CaseStatus } from "@/types/case";

interface CasesClientProps {
  initialData: CaseSearchResult;
  allTags: string[];
}

export function CasesClient({ initialData, allTags }: CasesClientProps) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      query: parseAsString.withDefault(""),
      category: parseAsString,
      status: parseAsString,
      tag: parseAsString,
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
      category: null,
      status: null,
      tag: null,
      page: 1,
    });
  }, [setParams]);

  const hasFilters = params.query || params.category || params.status || params.tag;

  const getPageUrl = (pageNum: number) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (params.category) searchParams.set("category", params.category);
    if (params.status) searchParams.set("status", params.status);
    if (params.tag) searchParams.set("tag", params.tag);
    if (pageNum > 1) searchParams.set("page", String(pageNum));

    const queryString = searchParams.toString();
    return queryString ? `/cases?${queryString}` : "/cases";
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <SearchInput
        value={params.query}
        onChange={(value) => updateParam("query", value)}
        placeholder="Search cases..."
        className="max-w-2xl"
      />

      {/* Filters */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Category</h3>
          <CategoryFilter
            value={params.category as CaseCategory | null}
            onChange={(value) => updateParam("category", value)}
          />
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Status</h3>
          <StatusFilter
            value={params.status as CaseStatus | null}
            onChange={(value) => updateParam("status", value)}
          />
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 10).map((tag) => (
                <Badge
                  key={tag}
                  variant={params.tag === tag ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => updateParam("tag", params.tag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="size-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {initialData.total} {initialData.total === 1 ? "case" : "cases"} found
      </p>

      {/* Results */}
      {isPending ? (
        <CaseGridSkeleton count={6} />
      ) : (
        <CaseGrid cases={initialData.cases} />
      )}

      {/* Pagination */}
      {initialData.totalPages > 1 && (
        <div className="mt-8">
          <PaginationLink
            currentPage={initialData.page}
            totalPages={initialData.totalPages}
            getPageUrl={getPageUrl}
          />
        </div>
      )}
    </div>
  );
}
