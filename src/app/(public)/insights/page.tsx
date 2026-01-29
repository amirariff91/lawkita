import type { Metadata } from "next";
import Link from "next/link";
import { getAllInsightsData } from "@/lib/db/queries/analytics";
import {
  StatsCard,
  GeographicChart,
  ExperienceChart,
  PracticeAreasChart,
  AdmissionTrendsChart,
} from "@/components/insights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ShieldCheck,
  UserCheck,
  Clock,
  Building2,
  Scale,
  AlertTriangle,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Legal Industry Insights | LawKita",
  description:
    "Explore statistics and trends about lawyers in Malaysia. Geographic distribution, experience levels, practice areas, and admission trends.",
  openGraph: {
    title: "Legal Industry Insights | LawKita",
    description:
      "Explore statistics and trends about lawyers in Malaysia. Geographic distribution, experience levels, practice areas, and admission trends.",
  },
};

interface InsightsPageProps {
  searchParams: Promise<{
    state?: string;
    practiceArea?: string;
  }>;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const { state, practiceArea } = await searchParams;
  const data = await getAllInsightsData({ state, practiceArea });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Legal Industry Insights</h1>
              <p className="text-muted-foreground">
                Statistics and trends about lawyers in Malaysia
              </p>
            </div>
          </div>

          {/* Active filters */}
          {(state || practiceArea) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtered by:</span>
              {state && <Badge variant="secondary">{state}</Badge>}
              {practiceArea && <Badge variant="secondary">{practiceArea}</Badge>}
              <Link
                href="/insights"
                className="text-sm text-primary hover:underline ml-2"
              >
                Clear filters
              </Link>
            </div>
          )}
        </div>

        {/* Overview Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Lawyers"
            value={data.overall.totalLawyers.toLocaleString()}
            icon={Users}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Bar Council Verified"
            value={data.overall.verifiedLawyers.toLocaleString()}
            description={`${Math.round((data.overall.verifiedLawyers / data.overall.totalLawyers) * 100)}% verified`}
            icon={ShieldCheck}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Average Experience"
            value={`${data.overall.avgYearsExperience} years`}
            icon={Clock}
            iconColor="text-amber-600"
          />
          <StatsCard
            title="Law Firms"
            value={data.overall.totalFirms.toLocaleString()}
            icon={Building2}
            iconColor="text-purple-600"
          />
        </div>

        {/* Main Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Geographic Distribution */}
          <GeographicChart data={data.geographic} />

          {/* Experience Distribution */}
          <ExperienceChart data={data.experience} />
        </div>

        {/* Practice Areas and Admission Trends */}
        <div className="grid lg:grid-cols-2 gap-6">
          <PracticeAreasChart data={data.practiceAreas} />
          <AdmissionTrendsChart data={data.admissionTrends} />
        </div>

        {/* Underserved Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="size-5 text-amber-500" />
              Underserved Areas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              States with fewer lawyers relative to population - opportunities for legal services
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-5 gap-4">
              {data.underservedAreas.map((area, index) => (
                <Link
                  key={area.state}
                  href={`/lawyers?state=${encodeURIComponent(area.state)}`}
                  className="group p-4 rounded-lg border hover:bg-accent transition-colors text-center"
                >
                  <Badge variant="outline" className="mb-2">
                    #{index + 1}
                  </Badge>
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {area.state}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {area.count.toLocaleString()} lawyers
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Looking for a lawyer?</h3>
                <p className="text-muted-foreground">
                  Browse our directory to find the right lawyer for your needs.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/lawyers"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Find a Lawyer
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/lawyers/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
                >
                  New Lawyers
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Source Note */}
        <p className="text-xs text-muted-foreground text-center">
          Data sourced from the Malaysian Bar Council Legal Directory. Statistics are updated
          periodically and reflect publicly available information.
        </p>
      </div>
    </div>
  );
}
