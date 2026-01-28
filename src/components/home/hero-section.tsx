"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchLegal, ArrowForward, SparklePremium } from "@/components/icons";
import { transitions, variants, viewportConfig } from "@/lib/motion";
import dynamic from "next/dynamic";

// Lazy load 3D component
const FloatingScalesLazy = dynamic(
  () =>
    import("@/components/3d/floating-scales").then(
      (mod) => mod.FloatingScalesLazy
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

// Popular practice areas for quick search
const popularPracticeAreas = [
  "Family Law",
  "Criminal Defense",
  "Corporate",
  "Property",
  "Employment",
];

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const shouldReduceMotion = useReducedMotion();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/lawyers?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-hero">
      {/* Background pattern */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_50%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.05),transparent_50%)]"
        aria-hidden="true"
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left side - Content */}
          <motion.div
            className="max-w-2xl"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitions.slow}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6"
              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...transitions.normal, delay: 0.1 }}
            >
              <SparklePremium className="size-4" />
              <span>5,000+ Verified Lawyers in Malaysia</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-display text-balance">
              Find the Right Lawyer{" "}
              <span className="text-primary">for Your Needs</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-hero-subtitle max-w-xl">
              Browse verified lawyers, explore their case history, read
              authentic reviews, and connect with legal professionals who match
              your requirements.
            </p>

            {/* Search Form */}
            <motion.form
              onSubmit={handleSearch}
              className="mt-10 flex flex-col sm:flex-row gap-3"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.normal, delay: 0.2 }}
            >
              <div className="relative flex-1">
                <SearchLegal
                  className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground"
                />
                <Input
                  type="search"
                  placeholder="Search by name, practice area, or location..."
                  className="h-14 pl-12 pr-4 text-base rounded-xl border-border/50 bg-background/80 backdrop-blur-sm shadow-sm focus-visible:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-14 px-8 rounded-xl shadow-lg shadow-primary/20"
              >
                Search
                <ArrowForward className="ml-2 size-5" />
              </Button>
            </motion.form>

            {/* Popular searches */}
            <motion.div
              className="mt-6 flex flex-wrap items-center gap-2"
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...transitions.normal, delay: 0.3 }}
            >
              <span className="text-sm text-muted-foreground">Popular:</span>
              {popularPracticeAreas.map((area) => (
                <Link
                  key={area}
                  href={`/lawyers?practiceArea=${encodeURIComponent(area)}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1 rounded-full bg-muted/50 hover:bg-primary/10"
                >
                  {area}
                </Link>
              ))}
            </motion.div>

            {/* Quick links */}
            <motion.div
              className="mt-8 flex flex-wrap gap-4"
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...transitions.normal, delay: 0.4 }}
            >
              <Link
                href="/lawyers"
                className="text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Browse All Lawyers
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/cases"
                className="text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Explore Famous Cases
              </Link>
            </motion.div>
          </motion.div>

          {/* Right side - 3D Element (desktop only) */}
          <motion.div
            className="hidden lg:flex items-center justify-center"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...transitions.slower, delay: 0.2 }}
          >
            <div className="relative w-full aspect-square max-w-md">
              {/* Glow effect behind 3D element */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-full blur-3xl"
                aria-hidden="true"
              />
              {/* 3D Scales */}
              <FloatingScalesLazy className="w-full h-full" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
