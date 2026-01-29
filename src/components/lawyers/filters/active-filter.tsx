"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ActiveFilterProps {
  showInactive: boolean;
  onChange: (value: boolean) => void;
}

export function ActiveFilter({ showInactive, onChange }: ActiveFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="show-inactive"
        checked={showInactive}
        onCheckedChange={onChange}
      />
      <Label
        htmlFor="show-inactive"
        className="text-sm text-muted-foreground cursor-pointer"
      >
        Show inactive lawyers
      </Label>
    </div>
  );
}
