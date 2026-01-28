"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Users, Gavel, Star, MapPin } from "lucide-react";
import {
  AnimatedCounter,
  StatCard,
} from "@/components/motion/animated-counter";
import { transitions, variants, viewportConfig } from "@/lib/motion";

const stats = [
  {
    value: 5000,
    suffix: "+",
    label: "Verified Lawyers",
    icon: <Users className="size-6" />,
  },
  {
    value: 15,
    suffix: "+",
    label: "Famous Cases",
    icon: <Gavel className="size-6" />,
  },
  {
    value: 4.8,
    decimals: 1,
    label: "Average Rating",
    icon: <Star className="size-6" />,
  },
  {
    value: 14,
    label: "States Covered",
    icon: <MapPin className="size-6" />,
  },
];

export function StatsSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-16 md:py-20 border-y bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
          initial={shouldReduceMotion ? {} : "hidden"}
          whileInView="visible"
          viewport={viewportConfig.default}
          variants={variants.staggerContainer}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center"
              variants={shouldReduceMotion ? {} : variants.fadeUp}
              transition={transitions.normal}
            >
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                  delay={index * 0.1}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Optional: Testimonial teaser */}
        <motion.div
          className="mt-12 text-center"
          initial={shouldReduceMotion ? {} : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportConfig.default}
          transition={{ ...transitions.normal, delay: 0.5 }}
        >
          <p className="text-muted-foreground italic">
            &quot;LawKita helped me find the perfect lawyer for my case. The
            verified reviews gave me confidence in my choice.&quot;
          </p>
          <p className="mt-2 text-sm font-medium">
            &mdash; Sarah T., Kuala Lumpur
          </p>
        </motion.div>
      </div>
    </section>
  );
}
