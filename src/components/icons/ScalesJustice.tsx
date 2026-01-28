import { IconProps } from "./Icon";

export function ScalesJustice({ size = 24, className, ...props }: IconProps) {
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
      {/* Central pillar */}
      <path
        d="M12 3v18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Balance beam */}
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Connection points */}
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      {/* Left scale pan */}
      <path
        d="M4 7l-1.5 6c-.2.8.4 1.5 1.2 1.5h2.6c.8 0 1.4-.7 1.2-1.5L6 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Right scale pan */}
      <path
        d="M18 7l1.5 6c.2.8-.4 1.5-1.2 1.5h-2.6c-.8 0-1.4-.7-1.2-1.5L16 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Base */}
      <path
        d="M8 21h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
