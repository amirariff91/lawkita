import { IconProps } from "./Icon";

export function SparklePremium({ size = 24, className, ...props }: IconProps) {
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
      {/* Main sparkle */}
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Central diamond */}
      <path
        d="M12 8l2 4-2 4-2-4 2-4z"
        fill="currentColor"
        opacity="0.3"
      />
      {/* Diagonal sparkles */}
      <path
        d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Small accent dots */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
