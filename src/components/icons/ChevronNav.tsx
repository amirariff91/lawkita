import { IconProps } from "./Icon";

interface ChevronNavProps extends IconProps {
  direction?: "left" | "right" | "up" | "down";
}

export function ChevronNav({
  size = 24,
  className,
  direction = "right",
  ...props
}: ChevronNavProps) {
  const getPath = () => {
    switch (direction) {
      case "left":
        return "M15 6l-6 6 6 6";
      case "right":
        return "M9 6l6 6-6 6";
      case "up":
        return "M6 15l6-6 6 6";
      case "down":
        return "M6 9l6 6 6-6";
      default:
        return "M9 6l6 6-6 6";
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Main chevron */}
      <path
        d={getPath()}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
