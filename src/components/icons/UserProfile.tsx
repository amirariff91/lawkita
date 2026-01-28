import { IconProps } from "./Icon";

export function UserProfile({ size = 24, className, ...props }: IconProps) {
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
      {/* Head circle */}
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Body/shoulders curve */}
      <path
        d="M4 21v-1a7 7 0 017-7h2a7 7 0 017 7v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle detail - collar */}
      <path
        d="M9 13.5c1 .5 2 .7 3 .7s2-.2 3-.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}
