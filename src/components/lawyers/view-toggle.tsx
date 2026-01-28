"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "size-8",
          view === "grid" && "bg-muted"
        )}
        onClick={() => onViewChange("grid")}
        aria-label="Grid view"
      >
        <LayoutGrid className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "size-8",
          view === "list" && "bg-muted"
        )}
        onClick={() => onViewChange("list")}
        aria-label="List view"
      >
        <List className="size-4" />
      </Button>
    </div>
  );
}
