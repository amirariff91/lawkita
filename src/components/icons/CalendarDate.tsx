import { IconProps } from "./Icon";

export function CalendarDate({ size = 24, className, ...props }: IconProps) {
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
      {/* Calendar body */}
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Header bar */}
      <path
        d="M3 9h18"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Top hooks */}
      <path
        d="M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Date dots - grid pattern */}
      <circle cx="8" cy="13" r="1" fill="currentColor" opacity="0.4" />
      <circle cx="12" cy="13" r="1" fill="currentColor" opacity="0.4" />
      <circle cx="16" cy="13" r="1" fill="currentColor" opacity="0.4" />
      <circle cx="8" cy="17" r="1" fill="currentColor" opacity="0.4" />
      {/* Highlighted date */}
      <circle cx="12" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}
