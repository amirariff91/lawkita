import { IconProps } from "./Icon";

export function UserPlus({ size = 24, className, ...props }: IconProps) {
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
        cx="9"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Body/shoulders */}
      <path
        d="M2 21v-1a6 6 0 016-6h2a6 6 0 016 6v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Plus sign */}
      <path
        d="M19 8v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 11h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Plus background circle */}
      <circle
        cx="19"
        cy="11"
        r="4"
        fill="currentColor"
        opacity="0.1"
      />
    </svg>
  );
}
