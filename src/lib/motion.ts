"use client";

import { type Transition, type Variants } from "framer-motion";

/**
 * Motion System for LawKita
 *
 * Provides consistent animation presets across the application.
 * All animations respect prefers-reduced-motion via Framer Motion's built-in support.
 */

// ============================================================================
// DURATION TOKENS
// ============================================================================

export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

// ============================================================================
// EASING CURVES
// ============================================================================

// Material Design 3 standard easing
export const easings = {
  // For elements entering the screen
  easeOut: [0.0, 0.0, 0.2, 1.0] as const,
  // For elements leaving the screen
  easeIn: [0.4, 0.0, 1.0, 1.0] as const,
  // For elements that stay on screen (most common)
  easeInOut: [0.4, 0.0, 0.2, 1.0] as const,
  // For emphasized movements
  emphasized: [0.2, 0.0, 0.0, 1.0] as const,
};

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

export const transitions = {
  // Micro-interactions (hover, focus, press)
  fast: {
    duration: durations.fast,
    ease: easings.easeInOut,
  } satisfies Transition,

  // Standard UI movements
  normal: {
    duration: durations.normal,
    ease: easings.easeInOut,
  } satisfies Transition,

  // Slower, more deliberate movements
  slow: {
    duration: durations.slow,
    ease: easings.easeInOut,
  } satisfies Transition,

  // Page transitions and major state changes
  slower: {
    duration: durations.slower,
    ease: easings.emphasized,
  } satisfies Transition,

  // Spring presets for interactive elements
  spring: {
    // Snappy - for buttons, toggles, quick feedback
    snappy: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
    // Bouncy - for playful interactions, notifications
    bouncy: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
    },
    // Smooth - for cards, panels, subtle movements
    smooth: {
      type: "spring" as const,
      stiffness: 200,
      damping: 40,
    },
    // Gentle - for large elements, page content
    gentle: {
      type: "spring" as const,
      stiffness: 120,
      damping: 20,
    },
  },
} as const;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

export const variants = {
  // Card hover effect
  card: {
    rest: {
      y: 0,
      scale: 1,
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    },
    hover: {
      y: -2,
      scale: 1,
      boxShadow:
        "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },
    tap: {
      y: 0,
      scale: 0.98,
    },
  } satisfies Variants,

  // Featured card with glow effect
  cardFeatured: {
    rest: {
      y: 0,
      boxShadow:
        "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.05)",
    },
    hover: {
      y: -4,
      boxShadow:
        "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(59 130 246 / 0.5)",
    },
  } satisfies Variants,

  // Button press effect
  button: {
    rest: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  } satisfies Variants,

  // Fade in animation
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  } satisfies Variants,

  // Fade up animation (for scroll reveals)
  fadeUp: {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
  } satisfies Variants,

  // Fade down animation
  fadeDown: {
    hidden: {
      opacity: 0,
      y: -20,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
  } satisfies Variants,

  // Scale up animation
  scaleUp: {
    hidden: {
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      scale: 1,
    },
  } satisfies Variants,

  // Slide in from left
  slideInLeft: {
    hidden: {
      opacity: 0,
      x: -20,
    },
    visible: {
      opacity: 1,
      x: 0,
    },
  } satisfies Variants,

  // Slide in from right
  slideInRight: {
    hidden: {
      opacity: 0,
      x: 20,
    },
    visible: {
      opacity: 1,
      x: 0,
    },
  } satisfies Variants,

  // Container for staggered children
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  } satisfies Variants,

  // Fast stagger for lists
  staggerContainerFast: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
  } satisfies Variants,

  // Child item for stagger containers
  staggerItem: {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
  } satisfies Variants,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a stagger container variant with custom timing
 */
export function createStaggerContainer(
  staggerChildren: number = 0.1,
  delayChildren: number = 0
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
}

/**
 * Creates a fade up variant with custom distance
 */
export function createFadeUp(distance: number = 20): Variants {
  return {
    hidden: {
      opacity: 0,
      y: distance,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
  };
}

/**
 * Viewport configuration for scroll-triggered animations
 */
export const viewportConfig = {
  // Trigger when element is 20% visible
  default: { once: true, margin: "-20% 0px" },
  // Trigger earlier (good for above-fold content)
  early: { once: true, margin: "0px" },
  // Trigger later (good for below-fold content)
  late: { once: true, margin: "-40% 0px" },
  // Repeat animation on every scroll
  repeat: { once: false, margin: "-20% 0px" },
} as const;

// ============================================================================
// REDUCED MOTION UTILITIES
// ============================================================================

/**
 * Returns a transition that respects reduced motion preferences.
 * When reduced motion is preferred, returns instant transition.
 */
export function getReducedMotionTransition(
  transition: Transition,
  reducedMotion: boolean
): Transition {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return transition;
}

/**
 * Returns variants that respect reduced motion preferences.
 * When reduced motion is preferred, removes transform properties.
 */
export function getReducedMotionVariants(
  baseVariants: Variants,
  reducedMotion: boolean
): Variants {
  if (!reducedMotion) return baseVariants;

  const reducedVariants: Variants = {};
  for (const [key, value] of Object.entries(baseVariants)) {
    if (typeof value === "object" && value !== null) {
      // Keep opacity, remove transforms
      const { y, x, scale, rotate, ...rest } = value as Record<string, unknown>;
      reducedVariants[key] = {
        ...rest,
        transition: { duration: 0 },
      };
    }
  }
  return reducedVariants;
}
