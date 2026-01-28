import { IconProps } from "./Icon";

export function DashboardGrid({ size = 24, className, ...props }: IconProps) {
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
      {/* Top left - larger panel */}
      <rect
        x="3"
        y="3"
        width="8"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Top right - small panel */}
      <rect
        x="14"
        y="3"
        width="7"
        height="5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.6"
      />
      {/* Bottom right - medium panel */}
      <rect
        x="14"
        y="11"
        width="7"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Bottom left - wide panel */}
      <rect
        x="3"
        y="14"
        width="8"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.6"
      />
    </svg>
  );
}
