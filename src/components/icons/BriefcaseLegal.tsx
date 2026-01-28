import { IconProps } from "./Icon";

export function BriefcaseLegal({ size = 24, className, ...props }: IconProps) {
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
      {/* Main briefcase body */}
      <rect
        x="2"
        y="7"
        width="20"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Handle/top section */}
      <path
        d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Center clasp */}
      <path
        d="M12 11v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Mid section divider */}
      <path
        d="M2 13h20"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
    </svg>
  );
}
