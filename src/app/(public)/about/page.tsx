import { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/static";
import { Button } from "@/components/ui/button";
import { Search, UserCheck, MessageSquare, Scale, Shield, Users, Heart, Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | LawKita",
  description: "Learn about LawKita's mission to make legal services more accessible to Malaysians by connecting them with qualified lawyers.",
};

const steps = [
  {
    icon: Search,
    title: "Search",
    description: "Browse our comprehensive directory of Malaysian lawyers by practice area, location, or name.",
  },
  {
    icon: UserCheck,
    title: "Compare",
    description: "View lawyer profiles with their qualifications, experience, case history, and client reviews.",
  },
  {
    icon: MessageSquare,
    title: "Connect",
    description: "Send enquiries directly to lawyers and get professional legal advice for your situation.",
  },
];

const values = [
  {
    icon: Shield,
    title: "Trust & Transparency",
    description: "We verify lawyer credentials and provide transparent information to help you make informed decisions.",
  },
  {
    icon: Users,
    title: "Accessibility",
    description: "We believe everyone deserves access to quality legal representation, regardless of background.",
  },
  {
    icon: Heart,
    title: "Community",
    description: "We're building a platform that serves the Malaysian legal community and the public interest.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We continuously improve our platform to better serve both lawyers and those seeking legal help.",
  },
];

const stats = [
  { value: "20,000+", label: "Lawyers Listed" },
  { value: "1,000+", label: "Verified Profiles" },
  { value: "14", label: "States Covered" },
  { value: "50+", label: "Practice Areas" },
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About LawKita"
        description="Making legal services accessible to all Malaysians"
      />

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Scale className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground">
              LawKita was founded with a simple mission: to bridge the gap between Malaysians
              seeking legal assistance and qualified lawyers who can help them. We believe that
              finding the right lawyer shouldn&apos;t be difficult or intimidating.
            </p>
            <p className="text-lg text-muted-foreground mt-4">
              Our platform provides comprehensive information about lawyers practicing in Malaysia,
              including their credentials, areas of expertise, and involvement in notable cases.
              We empower users to make informed decisions when seeking legal representation.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="relative inline-flex">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Famous Cases */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Famous Cases Explorer</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Beyond our lawyer directory, LawKita features a unique collection of famous Malaysian
              legal cases. Explore landmark judgments, understand the lawyers involved, and learn
              about the legal principles that shape Malaysia&apos;s judiciary.
            </p>
            <Button asChild>
              <Link href="/cases">Explore Famous Cases</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Are You a Lawyer?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Claim your profile on LawKita to manage your information, respond to client enquiries,
              and grow your practice. Verified lawyers get enhanced visibility and access to our
              suite of professional tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/lawyers">Find Your Profile</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View Premium Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
