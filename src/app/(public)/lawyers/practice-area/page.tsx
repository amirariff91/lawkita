import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import {
  getMainPracticeAreas,
  type PracticeAreaDefinition,
} from "@/lib/constants/practice-areas";
import { getLawyerCountsByPracticeArea } from "@/lib/db/queries/lawyers";

export const metadata: Metadata = {
  title: "Practice Areas | LawKita",
  description:
    "Browse lawyers by practice area. Find specialists in criminal law, family law, corporate law, property, intellectual property, and more across Malaysia.",
};

// Map icon names to simple display (we'll use lucide icons in a real implementation)
function PracticeAreaCard({
  area,
  lawyerCount,
}: {
  area: PracticeAreaDefinition;
  lawyerCount: number;
}) {
  return (
    <Link href={`/lawyers/practice-area/${area.slug}`}>
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 group">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="group-hover:text-primary transition-colors">
              {area.name}
            </span>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {area.description}
          </p>
          <Badge variant="secondary">
            {lawyerCount} {lawyerCount === 1 ? "lawyer" : "lawyers"}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function PracticeAreasIndexPage() {
  const practiceAreas = getMainPracticeAreas();
  const counts = await getLawyerCountsByPracticeArea();

  const countMap = new Map(counts.map((c) => [c.slug, c.count]));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Practice Areas</h1>
        <p className="text-muted-foreground mt-2">
          Find lawyers specializing in your legal matter
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {practiceAreas.map((area) => (
          <PracticeAreaCard
            key={area.slug}
            area={area}
            lawyerCount={countMap.get(area.slug) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
