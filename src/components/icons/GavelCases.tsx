import { IconProps } from "./Icon";

export function GavelCases({ size = 24, className, ...props }: IconProps) {
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
      {/* Gavel head */}
      <rect
        x="3"
        y="3"
        width="8"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(45 7 5.5)"
      />
      {/* Gavel handle */}
      <path
        d="M11 11l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Sound block base */}
      <path
        d="M14 21h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 21v-3a1 1 0 011-1h2a1 1 0 011 1v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Impact effect */}
      <path
        d="M5 19l2-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M3 16l1-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}
