"use client";

import { Badge } from "@/components/ui/badge";
import { CASE_STATUSES, type CaseStatus } from "@/types/case";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface StatusFilterProps {
  value: CaseStatus | null;
  onChange: (value: CaseStatus | null) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  ongoing: <Clock className="size-3" />,
  concluded: <CheckCircle2 className="size-3" />,
  appeal: <AlertCircle className="size-3" />,
};

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={value === null ? "default" : "outline"}
        className="cursor-pointer transition-colors"
        onClick={() => onChange(null)}
      >
        All Status
      </Badge>
      {CASE_STATUSES.map((status) => (
        <Badge
          key={status.value}
          variant={value === status.value ? "default" : "outline"}
          className="cursor-pointer transition-colors gap-1"
          onClick={() => onChange(status.value)}
        >
          {statusIcons[status.value]}
          {status.label}
        </Badge>
      ))}
    </div>
  );
}
