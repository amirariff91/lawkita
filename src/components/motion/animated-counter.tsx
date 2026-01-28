"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type SpringOptions,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  /** The target number to count to */
  value: number;
  /** Optional prefix (e.g., "$", "RM") */
  prefix?: string;
  /** Optional suffix (e.g., "+", "%", "k") */
  suffix?: string;
  /** Number of decimal places */
  decimals?: number;
  /** Duration in seconds (ignored if spring config provided) */
  duration?: number;
  /** Custom spring configuration */
  springConfig?: SpringOptions;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Format number with locale separators */
  formatNumber?: boolean;
  /** Locale for number formatting */
  locale?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2,
  springConfig,
  delay = 0,
  className,
  formatNumber = true,
  locale = "en-MY",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20% 0px" });
  const shouldReduceMotion = useReducedMotion();

  // Motion value to animate
  const motionValue = useMotionValue(0);

  // Spring animation (more natural than linear)
  const defaultSpring: SpringOptions = {
    stiffness: 50,
    damping: 30,
    mass: 1,
  };

  const springValue = useSpring(motionValue, springConfig || defaultSpring);

  // State for displayed value
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      // Delay if specified
      const timeoutId = setTimeout(() => {
        if (shouldReduceMotion) {
          // Skip animation if reduced motion preferred
          setDisplayValue(value);
        } else {
          motionValue.set(value);
        }
      }, delay * 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isInView, value, delay, motionValue, shouldReduceMotion]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(latest);
    });

    return unsubscribe;
  }, [springValue]);

  // Format the display value
  const formattedValue = formatNumber
    ? new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <motion.span
      ref={ref}
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </motion.span>
  );
}

// ============================================================================
// STAT CARD VARIANT
// ============================================================================

interface StatCardProps {
  /** The stat value */
  value: number;
  /** Label below the number */
  label: string;
  /** Optional prefix */
  prefix?: string;
  /** Optional suffix */
  suffix?: string;
  /** Number of decimal places */
  decimals?: number;
  /** Icon component */
  icon?: React.ReactNode;
  /** Additional CSS classes for the card */
  className?: string;
}

export function StatCard({
  value,
  label,
  prefix,
  suffix,
  decimals = 0,
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 text-primary" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="text-3xl font-bold tracking-tight md:text-4xl">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
        />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================================
// PROGRESS BAR VARIANT
// ============================================================================

interface AnimatedProgressProps {
  /** Progress value (0-100) */
  value: number;
  /** Optional label */
  label?: string;
  /** Show percentage text */
  showValue?: boolean;
  /** Bar height */
  size?: "sm" | "md" | "lg";
  /** Bar color variant */
  variant?: "default" | "success" | "warning" | "destructive";
  /** Additional CSS classes */
  className?: string;
}

export function AnimatedProgress({
  value,
  label,
  showValue = true,
  size = "md",
  variant = "default",
  className,
}: AnimatedProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20% 0px" });
  const shouldReduceMotion = useReducedMotion();

  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantStyles = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    destructive: "bg-destructive",
  };

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-medium tabular-nums">
              <AnimatedCounter value={clampedValue} suffix="%" decimals={0} />
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-secondary",
          sizeStyles[size]
        )}
      >
        <motion.div
          className={cn("h-full rounded-full", variantStyles[variant])}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${clampedValue}%` } : { width: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 50,
                  damping: 20,
                  delay: 0.2,
                }
          }
        />
      </div>
    </div>
  );
}
