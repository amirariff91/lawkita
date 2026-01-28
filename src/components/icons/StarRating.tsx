import { IconProps } from "./Icon";

export function StarRating({ size = 24, className, ...props }: IconProps) {
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
      {/* Main star - filled effect with dual tone */}
      <path
        d="M12 2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.8 2.9 1.1-6.5L2.6 8.8l6.5-.9L12 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner glow effect */}
      <path
        d="M12 6l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.5-3 1.5.6-3.3-2.4-2.3 3.3-.5L12 6z"
        fill="currentColor"
        opacity="0.2"
      />
      {/* Sparkle accents */}
      <circle cx="20" cy="4" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="4" cy="6" r="0.75" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
