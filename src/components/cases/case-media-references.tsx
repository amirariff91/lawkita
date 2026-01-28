import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Newspaper, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { CaseMediaReference } from "@/types/case";

interface CaseMediaReferencesProps {
  references: CaseMediaReference[];
}

export function CaseMediaReferences({ references }: CaseMediaReferencesProps) {
  if (references.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="size-5" />
          Media References
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {references.map((ref) => (
            <a
              key={ref.id}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-4 p-3 rounded-lg border hover:border-primary/20 hover:bg-muted/50 transition-all group"
            >
              <div className="min-w-0">
                <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                  {ref.title}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{ref.source}</span>
                  {ref.publishedAt && (
                    <>
                      <span>|</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>{format(new Date(ref.publishedAt), "d MMM yyyy")}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
