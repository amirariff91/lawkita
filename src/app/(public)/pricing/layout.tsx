import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare LawKita plans for lawyers. Start free or upgrade for premium features.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
