import { IconProps } from "./Icon";

export function FilterFunnel({ size = 24, className, ...props }: IconProps) {
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
      {/* Funnel shape */}
      <path
        d="M3 4h18l-7 8.5v6l-4 2.5v-8.5L3 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fill accent */}
      <path
        d="M5 6h14l-5.5 6.5v4l-3 2v-6L5 6z"
        fill="currentColor"
        opacity="0.1"
      />
      {/* Filter lines */}
      <path
        d="M7 7h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}
