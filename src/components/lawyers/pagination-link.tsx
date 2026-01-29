import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationLinkProps {
  currentPage: number;
  totalPages: number;
  /**
   * Function to generate the URL for a given page number.
   * Should return the full path with query params, e.g., "/lawyers/practice-area/family-law?page=2"
   */
  getPageUrl: (page: number) => string;
}

/**
 * Server-friendly pagination component using links instead of onClick handlers.
 * Use this for server-rendered pages where pagination should work without JavaScript.
 */
export function PaginationLink({
  currentPage,
  totalPages,
  getPageUrl,
}: PaginationLinkProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (showEllipsisStart) {
        pages.push("...");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (showEllipsisEnd) {
        pages.push("...");
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-1">
      {currentPage === 1 ? (
        <Button variant="outline" size="icon" className="size-8" disabled>
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="sr-only">Previous page</span>
        </Button>
      ) : (
        <Button variant="outline" size="icon" className="size-8" asChild>
          <Link href={getPageUrl(currentPage - 1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="sr-only">Previous page</span>
          </Link>
        </Button>
      )}

      {pages.map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : page === currentPage ? (
          <Button key={page} variant="default" size="icon" className="size-8">
            {page}
          </Button>
        ) : (
          <Button key={page} variant="outline" size="icon" className="size-8" asChild>
            <Link href={getPageUrl(page)}>{page}</Link>
          </Button>
        )
      )}

      {currentPage === totalPages ? (
        <Button variant="outline" size="icon" className="size-8" disabled>
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="sr-only">Next page</span>
        </Button>
      ) : (
        <Button variant="outline" size="icon" className="size-8" asChild>
          <Link href={getPageUrl(currentPage + 1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="sr-only">Next page</span>
          </Link>
        </Button>
      )}
    </div>
  );
}
