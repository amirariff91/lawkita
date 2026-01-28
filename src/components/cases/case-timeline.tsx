import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { TimelineEvent } from "@/types/case";

interface CaseTimelineProps {
  events: TimelineEvent[];
}

export function CaseTimeline({ events }: CaseTimelineProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No timeline events available for this case.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-8">
            {events.map((event, index) => (
              <div key={event.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                <div className="space-y-2">
                  {/* Date and court */}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>{format(new Date(event.date), "d MMMM yyyy")}</span>
                    </div>
                    {event.court && (
                      <>
                        <span className="hidden sm:inline">|</span>
                        <div className="flex items-center gap-1">
                          <Building2 className="size-3" />
                          <span>{event.court}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-lg">{event.title}</h4>

                  {/* Description */}
                  {event.description && (
                    <p className="text-muted-foreground">{event.description}</p>
                  )}

                  {/* Image */}
                  {event.image && (
                    <div className="mt-3">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="rounded-lg max-w-full h-auto max-h-64 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
