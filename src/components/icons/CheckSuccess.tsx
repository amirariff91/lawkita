import { IconProps } from "./Icon";

export function CheckSuccess({ size = 24, className, ...props }: IconProps) {
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
      {/* Circle */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Fill accent */}
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="currentColor"
        opacity="0.1"
      />
      {/* Check mark */}
      <path
        d="M8 12l2.5 3L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
