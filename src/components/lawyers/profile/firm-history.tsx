import Link from "next/link";
import { Building2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FirmHistoryProps {
  history: {
    firmName: string;
    firmSlug: string | null;
    isCurrent: boolean;
  }[];
}

export function FirmHistory({ history }: FirmHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  const currentFirm = history.find((h) => h.isCurrent);
  const previousFirms = history.filter((h) => !h.isCurrent);

  if (previousFirms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <History className="size-4 text-muted-foreground" aria-hidden="true" />
        <span>Career History</span>
      </div>
      <div className="space-y-2 pl-6 border-l-2 border-muted">
        {/* Current firm */}
        {currentFirm && (
          <div className="relative">
            <div className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
              {currentFirm.firmSlug ? (
                <Link
                  href={`/firms/${currentFirm.firmSlug}`}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {currentFirm.firmName}
                </Link>
              ) : (
                <span className="text-sm font-medium">{currentFirm.firmName}</span>
              )}
              <Badge variant="secondary" className="text-xs">Current</Badge>
            </div>
          </div>
        )}

        {/* Previous firms */}
        {previousFirms.map((firm, index) => (
          <div key={index} className="relative">
            <div className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-muted-foreground" />
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
              {firm.firmSlug ? (
                <Link
                  href={`/firms/${firm.firmSlug}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {firm.firmName}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">{firm.firmName}</span>
              )}
              <span className="text-xs text-muted-foreground">(Previously)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
