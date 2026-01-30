import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PlanFeature {
  text: string;
  included: boolean;
  icon?: LucideIcon;
}

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  annualPrice?: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  ctaHref: string;
  popular?: boolean;
  billingPeriod: "monthly" | "annual";
}

export function PricingCard({
  name,
  price,
  period,
  annualPrice,
  description,
  features,
  cta,
  ctaHref,
  popular = false,
  billingPeriod,
}: PricingCardProps) {
  const displayPrice =
    billingPeriod === "annual" && annualPrice
      ? annualPrice.split("/")[0]
      : price;
  const displayPeriod =
    billingPeriod === "annual" && annualPrice ? "/year" : period;

  return (
    <div
      className={`rounded-lg border bg-background p-6 relative ${
        popular ? "border-primary ring-2 ring-primary ring-offset-2" : ""
      }`}
    >
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold">{name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold">{displayPrice}</span>
          <span className="text-muted-foreground">{displayPeriod}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            {feature.included ? (
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
            )}
            <span
              className={feature.included ? "" : "text-muted-foreground line-through"}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <Button asChild className="w-full" variant={popular ? "default" : "outline"}>
        <Link href={ctaHref}>{cta}</Link>
      </Button>
    </div>
  );
}
