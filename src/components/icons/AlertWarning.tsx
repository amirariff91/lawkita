import { IconProps } from "./Icon";

export function AlertWarning({ size = 24, className, ...props }: IconProps) {
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
      {/* Triangle outline */}
      <path
        d="M12 3L2 21h20L12 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fill accent */}
      <path
        d="M12 6l-7.5 13h15L12 6z"
        fill="currentColor"
        opacity="0.1"
      />
      {/* Exclamation mark */}
      <path
        d="M12 10v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}
