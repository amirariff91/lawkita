import { IconProps } from "./Icon";

export function MapMalaysia({ size = 24, className, ...props }: IconProps) {
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
      {/* Map pin */}
      <path
        d="M12 21c-4-4-7-7.5-7-11a7 7 0 1114 0c0 3.5-3 7-7 11z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner circle */}
      <circle
        cx="12"
        cy="10"
        r="2.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.6"
      />
      {/* Location pulse effect */}
      <circle
        cx="12"
        cy="10"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.2"
      />
    </svg>
  );
}
