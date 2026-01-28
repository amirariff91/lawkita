import { IconProps } from "./Icon";

export function UsersVerified({ size = 24, className, ...props }: IconProps) {
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
      {/* Primary user */}
      <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M2 21v-2a5 5 0 015-5h4a5 5 0 015 5v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Secondary user (background) */}
      <circle
        cx="16"
        cy="6"
        r="2.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.5"
      />
      {/* Verification badge */}
      <circle cx="19" cy="17" r="4" fill="currentColor" opacity="0.15" />
      <path
        d="M17 17l1.5 1.5L21 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
