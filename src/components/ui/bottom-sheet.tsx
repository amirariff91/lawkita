"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type SnapPoint = number | "content";

interface BottomSheetContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  snapPoints: SnapPoint[];
  activeSnapPoint: SnapPoint;
  setActiveSnapPoint: (point: SnapPoint) => void;
}

const BottomSheetContext = React.createContext<BottomSheetContextValue | null>(
  null
);

function useBottomSheet() {
  const context = React.useContext(BottomSheetContext);
  if (!context) {
    throw new Error("useBottomSheet must be used within a BottomSheetProvider");
  }
  return context;
}

// ============================================================================
// BOTTOM SHEET ROOT
// ============================================================================

interface BottomSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Snap points as viewport height percentages (0-100) or "content" */
  snapPoints?: SnapPoint[];
  /** Default snap point index */
  defaultSnapPoint?: number;
}

function BottomSheet({
  children,
  open: controlledOpen,
  onOpenChange,
  snapPoints = [50, 90],
  defaultSnapPoint = 0,
}: BottomSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;

  const [activeSnapPoint, setActiveSnapPoint] = React.useState<SnapPoint>(
    snapPoints[defaultSnapPoint] ?? snapPoints[0]
  );

  return (
    <BottomSheetContext.Provider
      value={{
        isOpen,
        setIsOpen,
        snapPoints,
        activeSnapPoint,
        setActiveSnapPoint,
      }}
    >
      {children}
    </BottomSheetContext.Provider>
  );
}

// ============================================================================
// TRIGGER
// ============================================================================

interface BottomSheetTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function BottomSheetTrigger({
  children,
  asChild,
  onClick,
  ...props
}: BottomSheetTriggerProps) {
  const { setIsOpen } = useBottomSheet();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setIsOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

// ============================================================================
// PORTAL & OVERLAY
// ============================================================================

function BottomSheetOverlay() {
  const { isOpen, setIsOpen } = useBottomSheet();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// CONTENT
// ============================================================================

interface BottomSheetContentProps {
  children: React.ReactNode;
  className?: string;
  /** Minimum height when dragged down (percentage of viewport) */
  minHeight?: number;
}

function BottomSheetContent({
  children,
  className,
  minHeight = 10,
}: BottomSheetContentProps) {
  const {
    isOpen,
    setIsOpen,
    snapPoints,
    activeSnapPoint,
    setActiveSnapPoint,
  } = useBottomSheet();

  const dragControls = useDragControls();
  const y = useMotionValue(0);

  // Convert snap point to pixels
  const getSnapPointPixels = React.useCallback(
    (point: SnapPoint): number => {
      if (point === "content") return 0; // Will be determined by content
      return (point / 100) * window.innerHeight;
    },
    []
  );

  // Get current height based on active snap point
  const currentHeight = React.useMemo(() => {
    if (typeof activeSnapPoint === "number") {
      return `${activeSnapPoint}vh`;
    }
    return "auto";
  }, [activeSnapPoint]);

  // Handle drag end - snap to nearest point
  const handleDragEnd = React.useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      // If dragged down quickly or past threshold, close
      if (velocity > 500 || offset > 100) {
        setIsOpen(false);
        return;
      }

      // If dragged up quickly, go to max snap point
      if (velocity < -500) {
        const maxSnap = Math.max(
          ...snapPoints.filter((p): p is number => typeof p === "number")
        );
        setActiveSnapPoint(maxSnap);
        return;
      }

      // Find nearest snap point based on current position
      const currentY = y.get();
      const windowHeight = window.innerHeight;
      const currentPercent =
        ((windowHeight - currentY) / windowHeight) * 100;

      let nearestSnap = snapPoints[0];
      let minDistance = Infinity;

      for (const snap of snapPoints) {
        if (typeof snap === "number") {
          const distance = Math.abs(snap - currentPercent);
          if (distance < minDistance) {
            minDistance = distance;
            nearestSnap = snap;
          }
        }
      }

      setActiveSnapPoint(nearestSnap);
    },
    [snapPoints, setActiveSnapPoint, setIsOpen, y]
  );

  // Transform for drag indicator opacity
  const indicatorOpacity = useTransform(y, [-50, 0, 50], [0.3, 1, 0.3]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-background shadow-xl",
            className
          )}
          style={{ height: currentHeight, maxHeight: "90vh" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{
            type: "spring",
            damping: 30,
            stiffness: 300,
          }}
          drag="y"
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.1, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          role="dialog"
          aria-modal="true"
        >
          {/* Drag Handle */}
          <motion.div
            className="flex h-6 w-full cursor-grab items-center justify-center active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e)}
            style={{ opacity: indicatorOpacity }}
          >
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// HEADER
// ============================================================================

interface BottomSheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function BottomSheetHeader({ children, className }: BottomSheetHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b pb-4 mb-4",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// TITLE
// ============================================================================

interface BottomSheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

function BottomSheetTitle({ children, className }: BottomSheetTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>
  );
}

// ============================================================================
// CLOSE
// ============================================================================

interface BottomSheetCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

function BottomSheetClose({
  children,
  onClick,
  className,
  ...props
}: BottomSheetCloseProps) {
  const { setIsOpen } = useBottomSheet();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "text-sm text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      {...props}
    >
      {children ?? "Close"}
    </button>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

interface BottomSheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

function BottomSheetFooter({ children, className }: BottomSheetFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 mt-auto border-t bg-background pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetOverlay,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetClose,
  BottomSheetFooter,
  useBottomSheet,
};
